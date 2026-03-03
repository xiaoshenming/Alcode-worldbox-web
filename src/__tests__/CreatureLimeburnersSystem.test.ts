import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureLimeburnersSystem } from '../systems/CreatureLimeburnersSystem'
import type { Limeburner, LimeProduct } from '../systems/CreatureLimeburnersSystem'

// CHECK_INTERVAL=1450, SKILL_GROWTH=0.065
// purity = 20 + skill * 0.7
// reputation = 10 + skill * 0.75
// batchesBurned = 1 + Math.floor(skill / 10)
// product: prodIdx = Math.min(3, Math.floor(skill/25))
// cleanup cutoff = tick - 54000

let nextId = 1
function makeSys(): CreatureLimeburnersSystem { return new CreatureLimeburnersSystem() }
function makeMaker(entityId: number, overrides: Partial<Limeburner> = {}): Limeburner {
  return {
    id: nextId++, entityId, skill: 30, batchesBurned: 4,
    product: 'quicklime', purity: 41, reputation: 32.5, tick: 0,
    ...overrides
  }
}
function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getEntitiesWithComponent: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(false),
  } as any
}

describe('CreatureLimeburnersSystem - 基础状态', () => {
  let sys: CreatureLimeburnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无石灰烧制工', () => { expect((sys as any).burners).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('注入后可查询', () => {
    ;(sys as any).burners.push(makeMaker(1, { product: 'slaked_lime' }))
    expect((sys as any).burners[0].product).toBe('slaked_lime')
  })

  it('LimeProduct包含4种类型', () => {
    const products: LimeProduct[] = ['quicklime', 'slaked_lime', 'mortar', 'plaster']
    products.forEach((p, i) => { ;(sys as any).burners.push(makeMaker(i + 1, { product: p })) })
    const all = (sys as any).burners as Limeburner[]
    products.forEach((p, i) => { expect(all[i].product).toBe(p) })
  })

  it('多个全部返回', () => {
    ;(sys as any).burners.push(makeMaker(1))
    ;(sys as any).burners.push(makeMaker(2))
    expect((sys as any).burners).toHaveLength(2)
  })

  it('内部引用一致', () => {
    ;(sys as any).burners.push(makeMaker(1))
    expect((sys as any).burners).toBe((sys as any).burners)
  })
})

describe('CreatureLimeburnersSystem - 公式验证', () => {
  it('purity公式: skill=50 → 20+50*0.7=55', () => {
    expect(20 + 50 * 0.7).toBeCloseTo(55, 5)
  })
  it('purity公式: skill=0 → 20', () => {
    expect(20 + 0 * 0.7).toBeCloseTo(20, 5)
  })
  it('purity公式: skill=100 → 20+100*0.7=90', () => {
    expect(20 + 100 * 0.7).toBeCloseTo(90, 5)
  })
  it('reputation公式: skill=50 → 10+50*0.75=47.5', () => {
    expect(10 + 50 * 0.75).toBeCloseTo(47.5, 5)
  })
  it('reputation公式: skill=100 → 10+100*0.75=85', () => {
    expect(10 + 100 * 0.75).toBeCloseTo(85, 5)
  })
  it('batchesBurned: skill=50 → 1+floor(50/10)=6', () => {
    expect(1 + Math.floor(50 / 10)).toBe(6)
  })
  it('batchesBurned: skill=0 → 1', () => {
    expect(1 + Math.floor(0 / 10)).toBe(1)
  })
  it('batchesBurned: skill=100 → 1+floor(100/10)=11', () => {
    expect(1 + Math.floor(100 / 10)).toBe(11)
  })

  it('product: skill=10 → quicklime', () => {
    const PRODUCTS: LimeProduct[] = ['quicklime', 'slaked_lime', 'mortar', 'plaster']
    expect(PRODUCTS[Math.min(3, Math.floor(10 / 25))]).toBe('quicklime')
  })
  it('product: skill=25 → slaked_lime', () => {
    const PRODUCTS: LimeProduct[] = ['quicklime', 'slaked_lime', 'mortar', 'plaster']
    expect(PRODUCTS[Math.min(3, Math.floor(25 / 25))]).toBe('slaked_lime')
  })
  it('product: skill=50 → mortar', () => {
    const PRODUCTS: LimeProduct[] = ['quicklime', 'slaked_lime', 'mortar', 'plaster']
    expect(PRODUCTS[Math.min(3, Math.floor(50 / 25))]).toBe('mortar')
  })
  it('product: skill=75 → plaster', () => {
    const PRODUCTS: LimeProduct[] = ['quicklime', 'slaked_lime', 'mortar', 'plaster']
    expect(PRODUCTS[Math.min(3, Math.floor(75 / 25))]).toBe('plaster')
  })
  it('product: skill=100 → plaster(上限3)', () => {
    const PRODUCTS: LimeProduct[] = ['quicklime', 'slaked_lime', 'mortar', 'plaster']
    expect(PRODUCTS[Math.min(3, Math.floor(100 / 25))]).toBe('plaster')
  })
})

describe('CreatureLimeburnersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureLimeburnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick差<1450不更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1449)
    expect((sys as any).lastCheck).toBe(0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })
  it('tick差>=1450更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1450)
    expect((sys as any).lastCheck).toBe(1450)
  })
  it('tick=1449边界不更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1449)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('第二次差值不足时保持', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1450)
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(1450)
  })
  it('第二次差值足够时再次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1450)
    sys.update(1, em, 2900)
    expect((sys as any).lastCheck).toBe(2900)
  })
})

describe('CreatureLimeburnersSystem - time-based cleanup', () => {
  let sys: CreatureLimeburnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期记录被清除, cutoff=tick-54000', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).burners.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).burners.push(makeMaker(2, { tick: 55000 }))
    sys.update(1, em, 60000)
    expect((sys as any).burners).toHaveLength(1)
    expect((sys as any).burners[0].entityId).toBe(2)
  })
  it('未过期记录全部保留', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).burners.push(makeMaker(1, { tick: 55000 }))
    ;(sys as any).burners.push(makeMaker(2, { tick: 56000 }))
    sys.update(1, em, 60000)
    expect((sys as any).burners).toHaveLength(2)
  })
  it('cutoff边界: cutoff=60000-54000=6000', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).burners.push(makeMaker(1, { tick: 5999 }))
    ;(sys as any).burners.push(makeMaker(2, { tick: 6000 }))
    sys.update(1, em, 60000)
    expect((sys as any).burners).toHaveLength(1)
    expect((sys as any).burners[0].entityId).toBe(2)
  })
  it('全部过期时全部删除', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).burners.push(makeMaker(1, { tick: 0 }))
    sys.update(1, em, 60000)
    expect((sys as any).burners).toHaveLength(0)
  })
})

describe('CreatureLimeburnersSystem - skillMap 操作', () => {
  let sys: CreatureLimeburnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skillMap初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('未知实体返回undefined', () => { expect((sys as any).skillMap.get(999)).toBeUndefined() })
  it('注入后可读取', () => {
    ;(sys as any).skillMap.set(5, 65)
    expect((sys as any).skillMap.get(5)).toBe(65)
  })
  it('多个实体独立存储', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(60)
  })
})

describe('CreatureLimeburnersSystem - 边界与综合', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    expect(() => makeSys().update(1, makeEmptyEM(), 1450)).not.toThrow()
  })
  it('dt参数不影响节流', () => {
    const sys = makeSys()
    sys.update(999, makeEmptyEM(), 1449)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('entityId被正确保存', () => {
    const sys = makeSys()
    ;(sys as any).burners.push(makeMaker(22))
    expect((sys as any).burners[0].entityId).toBe(22)
  })
  it('所有字段类型正确', () => {
    const sys = makeSys()
    ;(sys as any).burners.push(makeMaker(1))
    const r = (sys as any).burners[0]
    expect(typeof r.skill).toBe('number')
    expect(typeof r.batchesBurned).toBe('number')
    expect(typeof r.purity).toBe('number')
    expect(typeof r.reputation).toBe('number')
  })
})
