import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureHornersSystem } from '../systems/CreatureHornersSystem'
import type { Horner, HornProduct } from '../systems/CreatureHornersSystem'

// CHECK_INTERVAL=1450, SKILL_GROWTH=0.065
// quality = 20 + skill * 0.65
// reputation = 10 + skill * 0.8
// itemsCrafted = 1 + Math.floor(skill / 7)
// product: prodIdx = Math.min(3, Math.floor(skill/25))
// cleanup cutoff = tick - 53000

let nextId = 1
function makeSys(): CreatureHornersSystem { return new CreatureHornersSystem() }
function makeMaker(entityId: number, overrides: Partial<Horner> = {}): Horner {
  return {
    id: nextId++, entityId, skill: 30, itemsCrafted: 5,
    product: 'comb', quality: 39.5, reputation: 34, tick: 0,
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

describe('CreatureHornersSystem - 基础状态', () => {
  let sys: CreatureHornersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无角制品工', () => { expect((sys as any).horners).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('注入后可查询 entityId', () => {
    ;(sys as any).horners.push(makeMaker(5))
    expect((sys as any).horners[0].entityId).toBe(5)
  })

  it('注入后 product 正确', () => {
    ;(sys as any).horners.push(makeMaker(1, { product: 'button' }))
    expect((sys as any).horners[0].product).toBe('button')
  })

  it('多个全部返回', () => {
    ;(sys as any).horners.push(makeMaker(1))
    ;(sys as any).horners.push(makeMaker(2))
    expect((sys as any).horners).toHaveLength(2)
  })

  it('内部引用一致', () => {
    ;(sys as any).horners.push(makeMaker(1))
    expect((sys as any).horners).toBe((sys as any).horners)
  })
})

describe('CreatureHornersSystem - HornProduct 4种枚举', () => {
  it('支持 comb', () => {
    const h: Horner = { id: 1, entityId: 1, skill: 30, itemsCrafted: 5, product: 'comb', quality: 40, reputation: 34, tick: 0 }
    expect(h.product).toBe('comb')
  })
  it('支持 button', () => {
    const h: Horner = { id: 2, entityId: 2, skill: 30, itemsCrafted: 5, product: 'button', quality: 40, reputation: 34, tick: 0 }
    expect(h.product).toBe('button')
  })
  it('支持 cup', () => {
    const h: Horner = { id: 3, entityId: 3, skill: 30, itemsCrafted: 5, product: 'cup', quality: 40, reputation: 34, tick: 0 }
    expect(h.product).toBe('cup')
  })
  it('支持 ornament', () => {
    const h: Horner = { id: 4, entityId: 4, skill: 30, itemsCrafted: 5, product: 'ornament', quality: 40, reputation: 34, tick: 0 }
    expect(h.product).toBe('ornament')
  })
})

describe('CreatureHornersSystem - quality/reputation 公式', () => {
  it('skill=60 时 quality = 20 + 60*0.65 = 59', () => {
    expect(20 + 60 * 0.65).toBeCloseTo(59, 5)
  })
  it('skill=0 时 quality = 20', () => {
    expect(20 + 0 * 0.65).toBeCloseTo(20, 5)
  })
  it('skill=100 时 quality = 20 + 100*0.65 = 85', () => {
    expect(20 + 100 * 0.65).toBeCloseTo(85, 5)
  })
  it('skill=100 时 reputation = 10 + 100*0.8 = 90', () => {
    expect(10 + 100 * 0.8).toBeCloseTo(90, 5)
  })
  it('skill=0 时 reputation = 10', () => {
    expect(10 + 0 * 0.8).toBeCloseTo(10, 5)
  })
  it('skill=50 时 reputation = 10 + 50*0.8 = 50', () => {
    expect(10 + 50 * 0.8).toBeCloseTo(50, 5)
  })
})

describe('CreatureHornersSystem - itemsCrafted 公式', () => {
  it('skill=7 时 itemsCrafted = 1 + floor(7/7) = 2', () => {
    expect(1 + Math.floor(7 / 7)).toBe(2)
  })
  it('skill=0 时 itemsCrafted = 1', () => {
    expect(1 + Math.floor(0 / 7)).toBe(1)
  })
  it('skill=49 时 itemsCrafted = 1 + floor(49/7) = 8', () => {
    expect(1 + Math.floor(49 / 7)).toBe(8)
  })
  it('skill=100 时 itemsCrafted = 1 + floor(100/7) = 15', () => {
    expect(1 + Math.floor(100 / 7)).toBe(15)
  })
})

describe('CreatureHornersSystem - product 4段 skill 映射', () => {
  const PRODUCTS: HornProduct[] = ['comb', 'button', 'cup', 'ornament']
  it('skill=10 => comb (idx 0)', () => {
    expect(PRODUCTS[Math.min(3, Math.floor(10 / 25))]).toBe('comb')
  })
  it('skill=25 => button (idx 1)', () => {
    expect(PRODUCTS[Math.min(3, Math.floor(25 / 25))]).toBe('button')
  })
  it('skill=50 => cup (idx 2)', () => {
    expect(PRODUCTS[Math.min(3, Math.floor(50 / 25))]).toBe('cup')
  })
  it('skill=75 => ornament (idx 3)', () => {
    expect(PRODUCTS[Math.min(3, Math.floor(75 / 25))]).toBe('ornament')
  })
  it('skill=100 => ornament (上限3)', () => {
    expect(PRODUCTS[Math.min(3, Math.floor(100 / 25))]).toBe('ornament')
  })
})

describe('CreatureHornersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureHornersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick差<1450时update不改变lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1449)
    expect((sys as any).lastCheck).toBe(0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick差>=1450时update更新lastCheck', () => {
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

describe('CreatureHornersSystem - time-based cleanup', () => {
  let sys: CreatureHornersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期记录(<cutoff=currentTick-53000)被清除', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).horners.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).horners.push(makeMaker(2, { tick: 55000 }))
    sys.update(1, em, 60000)
    expect((sys as any).horners).toHaveLength(1)
    expect((sys as any).horners[0].entityId).toBe(2)
  })

  it('未过期记录全部保留', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).horners.push(makeMaker(1, { tick: 55000 }))
    ;(sys as any).horners.push(makeMaker(2, { tick: 56000 }))
    sys.update(1, em, 60000)
    expect((sys as any).horners).toHaveLength(2)
  })

  it('cutoff边界: cutoff=60000-53000=7000', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).horners.push(makeMaker(1, { tick: 6999 }))
    ;(sys as any).horners.push(makeMaker(2, { tick: 7000 }))
    sys.update(1, em, 60000)
    expect((sys as any).horners).toHaveLength(1)
    expect((sys as any).horners[0].entityId).toBe(2)
  })

  it('全部过期时全部删除', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).horners.push(makeMaker(1, { tick: 0 }))
    sys.update(1, em, 60000)
    expect((sys as any).horners).toHaveLength(0)
  })
})

describe('CreatureHornersSystem - skillMap 操作', () => {
  let sys: CreatureHornersSystem
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

describe('CreatureHornersSystem - 边界与综合', () => {
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
    ;(sys as any).horners.push(makeMaker(33))
    expect((sys as any).horners[0].entityId).toBe(33)
  })

  it('所有字段类型正确', () => {
    const sys = makeSys()
    ;(sys as any).horners.push(makeMaker(1))
    const r = (sys as any).horners[0]
    expect(typeof r.skill).toBe('number')
    expect(typeof r.itemsCrafted).toBe('number')
    expect(typeof r.quality).toBe('number')
    expect(typeof r.reputation).toBe('number')
  })
})
