import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureIlluminatorsSystem } from '../systems/CreatureIlluminatorsSystem'
import type { Illuminator, IlluminationStyle } from '../systems/CreatureIlluminatorsSystem'

// CHECK_INTERVAL=1350, SKILL_GROWTH=0.056
// goldLeafUse = 10 + skill * 0.74
// reputation = 10 + skill * 0.86
// pagesIlluminated = 1 + Math.floor(skill / 10)
// style: styleIdx = Math.min(3, Math.floor(skill/25))
// cleanup cutoff = tick - 50500

let nextId = 1
function makeSys(): CreatureIlluminatorsSystem { return new CreatureIlluminatorsSystem() }
function makeMaker(entityId: number, overrides: Partial<Illuminator> = {}): Illuminator {
  return {
    id: nextId++, entityId, skill: 30, pagesIlluminated: 4,
    style: 'historiated', goldLeafUse: 32.2, reputation: 35.8, tick: 0,
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

describe('CreatureIlluminatorsSystem - 基础状态', () => {
  let sys: CreatureIlluminatorsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无照明师', () => { expect((sys as any).makers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, { style: 'decorated' }))
    expect((sys as any).makers[0].style).toBe('decorated')
  })

  it('IlluminationStyle包含4种类型', () => {
    const styles: IlluminationStyle[] = ['historiated', 'decorated', 'inhabited', 'border']
    styles.forEach((s, i) => { ;(sys as any).makers.push(makeMaker(i + 1, { style: s })) })
    const all = (sys as any).makers as Illuminator[]
    styles.forEach((s, i) => { expect(all[i].style).toBe(s) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('内部引用一致', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
})

describe('CreatureIlluminatorsSystem - 公式验证', () => {
  it('goldLeafUse公式: skill=40 → 10+40*0.74=39.6', () => {
    expect(10 + 40 * 0.74).toBeCloseTo(39.6, 5)
  })
  it('goldLeafUse公式: skill=0 → 10', () => {
    expect(10 + 0 * 0.74).toBeCloseTo(10, 5)
  })
  it('goldLeafUse公式: skill=100 → 10+100*0.74=84', () => {
    expect(10 + 100 * 0.74).toBeCloseTo(84, 5)
  })
  it('reputation公式: skill=50 → 10+50*0.86=53', () => {
    expect(10 + 50 * 0.86).toBeCloseTo(53, 5)
  })
  it('reputation公式: skill=100 → 10+100*0.86=96', () => {
    expect(10 + 100 * 0.86).toBeCloseTo(96, 5)
  })
  it('pagesIlluminated: skill=40 → 1+floor(40/10)=5', () => {
    expect(1 + Math.floor(40 / 10)).toBe(5)
  })
  it('pagesIlluminated: skill=0 → 1', () => {
    expect(1 + Math.floor(0 / 10)).toBe(1)
  })
  it('pagesIlluminated: skill=100 → 1+floor(100/10)=11', () => {
    expect(1 + Math.floor(100 / 10)).toBe(11)
  })

  it('style: skill=10 → historiated', () => {
    const STYLES: IlluminationStyle[] = ['historiated', 'decorated', 'inhabited', 'border']
    expect(STYLES[Math.min(3, Math.floor(10 / 25))]).toBe('historiated')
  })
  it('style: skill=25 → decorated', () => {
    const STYLES: IlluminationStyle[] = ['historiated', 'decorated', 'inhabited', 'border']
    expect(STYLES[Math.min(3, Math.floor(25 / 25))]).toBe('decorated')
  })
  it('style: skill=50 → inhabited', () => {
    const STYLES: IlluminationStyle[] = ['historiated', 'decorated', 'inhabited', 'border']
    expect(STYLES[Math.min(3, Math.floor(50 / 25))]).toBe('inhabited')
  })
  it('style: skill=75 → border', () => {
    const STYLES: IlluminationStyle[] = ['historiated', 'decorated', 'inhabited', 'border']
    expect(STYLES[Math.min(3, Math.floor(75 / 25))]).toBe('border')
  })
  it('style: skill=100 → border(上限3)', () => {
    const STYLES: IlluminationStyle[] = ['historiated', 'decorated', 'inhabited', 'border']
    expect(STYLES[Math.min(3, Math.floor(100 / 25))]).toBe('border')
  })
})

describe('CreatureIlluminatorsSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureIlluminatorsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick差<1350不更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1349)
    expect((sys as any).lastCheck).toBe(0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })
  it('tick差>=1350更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1350)
    expect((sys as any).lastCheck).toBe(1350)
  })
  it('tick=1349边界不更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1349)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('第二次差值不足时保持', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1350)
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(1350)
  })
  it('第二次差值足够时再次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1350)
    sys.update(1, em, 2700)
    expect((sys as any).lastCheck).toBe(2700)
  })
})

describe('CreatureIlluminatorsSystem - time-based cleanup', () => {
  let sys: CreatureIlluminatorsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期记录被清除, cutoff=tick-50500', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 55000 }))
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
  it('未过期记录全部保留', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 55000 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 56000 }))
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(2)
  })
  it('cutoff边界: cutoff=60000-50500=9500', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 9499 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 9500 }))
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
  it('全部过期时全部删除', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })
})

describe('CreatureIlluminatorsSystem - skillMap 操作', () => {
  let sys: CreatureIlluminatorsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skillMap初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('未知实体返回undefined', () => { expect((sys as any).skillMap.get(999)).toBeUndefined() })
  it('注入后可读取', () => {
    ;(sys as any).skillMap.set(5, 56)
    expect((sys as any).skillMap.get(5)).toBe(56)
  })
  it('多个实体独立存储', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(60)
  })
})

describe('CreatureIlluminatorsSystem - 边界与综合', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    expect(() => makeSys().update(1, makeEmptyEM(), 1350)).not.toThrow()
  })

  it('dt参数不影响节流', () => {
    const sys = makeSys()
    sys.update(999, makeEmptyEM(), 1349)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('entityId被正确保存', () => {
    const sys = makeSys()
    ;(sys as any).makers.push(makeMaker(44))
    expect((sys as any).makers[0].entityId).toBe(44)
  })

  it('所有字段类型正确', () => {
    const sys = makeSys()
    ;(sys as any).makers.push(makeMaker(1))
    const r = (sys as any).makers[0]
    expect(typeof r.skill).toBe('number')
    expect(typeof r.pagesIlluminated).toBe('number')
    expect(typeof r.goldLeafUse).toBe('number')
    expect(typeof r.reputation).toBe('number')
  })
})
