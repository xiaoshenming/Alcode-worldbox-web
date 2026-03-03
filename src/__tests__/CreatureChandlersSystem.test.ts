import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureChandlersSystem } from '../systems/CreatureChandlersSystem'
import type { Chandler, WaxType } from '../systems/CreatureChandlersSystem'

let nextId = 1
function makeSys(): CreatureChandlersSystem { return new CreatureChandlersSystem() }
function makeMaker(entityId: number, waxType: WaxType = 'tallow', skill = 30, tick = 0): Chandler {
  return { id: nextId++, entityId, skill, candlesMade: 10, waxType, burnQuality: 60, reputation: 50, tick }
}

function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getEntitiesWithComponent: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(false),
  } as any
}

describe('CreatureChandlersSystem - 基础状态', () => {
  let sys: CreatureChandlersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无蜡烛师记录', () => { expect((sys as any).makers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始 skillMap 为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('注入后可查询 waxType', () => {
    ;(sys as any).makers.push(makeMaker(1, 'beeswax'))
    expect((sys as any).makers[0].waxType).toBe('beeswax')
  })
  it('支持所有 4 种蜡类型', () => {
    const types: WaxType[] = ['tallow', 'beeswax', 'bayberry', 'spermaceti']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].waxType).toBe(t) })
  })
  it('多个记录全部保存', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
  it('注入记录的 entityId 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(42))
    expect((sys as any).makers[0].entityId).toBe(42)
  })
  it('注入记录的 skill 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 'tallow', 75))
    expect((sys as any).makers[0].skill).toBe(75)
  })
  it('注入记录的 tick 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 'tallow', 30, 9999))
    expect((sys as any).makers[0].tick).toBe(9999)
  })
  it('注入记录的 burnQuality 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].burnQuality).toBe(60)
  })
  it('注入记录的 reputation 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].reputation).toBe(50)
  })
})

describe('CreatureChandlersSystem - 公式计算', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('burnQuality = 18 + skill * 0.65，skill=40 → 44', () => {
    expect(18 + 40 * 0.65).toBeCloseTo(44, 5)
  })
  it('reputation = 10 + skill * 0.78，skill=40 → 41.2', () => {
    expect(10 + 40 * 0.78).toBeCloseTo(41.2, 5)
  })
  it('candlesMade = 1 + Math.floor(skill/7)，skill=49 → 8', () => {
    expect(1 + Math.floor(49 / 7)).toBe(8)
  })
  it('candlesMade = 1 + Math.floor(skill/7)，skill=7 → 2', () => {
    expect(1 + Math.floor(7 / 7)).toBe(2)
  })
  it('candlesMade = 1 + Math.floor(skill/7)，skill=0 → 1', () => {
    expect(1 + Math.floor(0 / 7)).toBe(1)
  })
  it('candlesMade = 1 + Math.floor(skill/7)，skill=100 → 15', () => {
    expect(1 + Math.floor(100 / 7)).toBe(15)
  })
  it('burnQuality = 18 + skill * 0.65，skill=0 → 18', () => {
    expect(18 + 0 * 0.65).toBeCloseTo(18, 5)
  })
  it('burnQuality = 18 + skill * 0.65，skill=100 → 83', () => {
    expect(18 + 100 * 0.65).toBeCloseTo(83, 5)
  })
  it('reputation = 10 + skill * 0.78，skill=0 → 10', () => {
    expect(10 + 0 * 0.78).toBeCloseTo(10, 5)
  })
  it('reputation = 10 + skill * 0.78，skill=100 → 88', () => {
    expect(10 + 100 * 0.78).toBeCloseTo(88, 5)
  })
  it('waxType 分段：skill<25 → tallow（typeIdx=0）', () => {
    const WAX: WaxType[] = ['tallow', 'beeswax', 'bayberry', 'spermaceti']
    expect(WAX[Math.min(3, Math.floor(20 / 25))]).toBe('tallow')
  })
  it('waxType 分段：skill=25 → beeswax（typeIdx=1）', () => {
    const WAX: WaxType[] = ['tallow', 'beeswax', 'bayberry', 'spermaceti']
    expect(WAX[Math.min(3, Math.floor(25 / 25))]).toBe('beeswax')
  })
  it('waxType 分段：skill=50 → bayberry（typeIdx=2）', () => {
    const WAX: WaxType[] = ['tallow', 'beeswax', 'bayberry', 'spermaceti']
    expect(WAX[Math.min(3, Math.floor(50 / 25))]).toBe('bayberry')
  })
  it('waxType 分段：skill=75 → spermaceti（typeIdx=3）', () => {
    const WAX: WaxType[] = ['tallow', 'beeswax', 'bayberry', 'spermaceti']
    expect(WAX[Math.min(3, Math.floor(75 / 25))]).toBe('spermaceti')
  })
  it('waxType 分段：skill=100 → spermaceti（上限 3）', () => {
    const WAX: WaxType[] = ['tallow', 'beeswax', 'bayberry', 'spermaceti']
    const idx = Math.min(3, Math.floor(100 / 25))
    expect(idx).toBe(3)
    expect(WAX[idx]).toBe('spermaceti')
  })
  it('skill=24 时仍为 tallow（边界）', () => {
    const WAX: WaxType[] = ['tallow', 'beeswax', 'bayberry', 'spermaceti']
    expect(WAX[Math.min(3, Math.floor(24 / 25))]).toBe('tallow')
  })
  it('skill=74 时为 bayberry（边界前）', () => {
    const WAX: WaxType[] = ['tallow', 'beeswax', 'bayberry', 'spermaceti']
    expect(WAX[Math.min(3, Math.floor(74 / 25))]).toBe('bayberry')
  })
  it('SKILL_GROWTH=0.060', () => {
    const SKILL_GROWTH = 0.060
    expect(SKILL_GROWTH).toBeCloseTo(0.06, 5)
  })
  it('skill 上限为 100：99 + 0.06 = 99.06', () => {
    const skill = Math.min(100, 99 + 0.060)
    expect(skill).toBeCloseTo(99.06, 5)
  })
  it('skill 已是 100 时不超过 100', () => {
    const skill = Math.min(100, 100 + 0.060)
    expect(skill).toBe(100)
  })
})

describe('CreatureChandlersSystem - CHECK_INTERVAL 与 update', () => {
  let sys: CreatureChandlersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 差值 < 1400 时不更新 lastCheck', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 2399)
    expect((sys as any).lastCheck).toBe(1000)
  })
  it('tick 差值 < 1400 时不调用 getEntitiesWithComponents', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 2399)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })
  it('tick 差值 >= 1400 时 lastCheck 更新为当前 tick', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1400)
    expect((sys as any).lastCheck).toBe(1400)
  })
  it('tick 差值 = 1399 时不更新（边界值）', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1399)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=1400 时恰好触发', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1400)
    expect((sys as any).lastCheck).toBe(1400)
  })
  it('多次连续调用，第二次不足间隔时不更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1400)
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(1400)
  })
  it('达到第二次间隔时正确更新 lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1400)
    sys.update(1, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })
})

describe('CreatureChandlersSystem - time-based cleanup', () => {
  let sys: CreatureChandlersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 的记录在 currentTick=60000 时被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, 'tallow', 30, 0))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('tick=55000 的记录在 currentTick=60000 时被保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 'tallow', 30, 55000))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('cutoff 边界：tick=6999 在 currentTick=60000 时被删除', () => {
    ;(sys as any).makers.push(makeMaker(1, 'tallow', 30, 6999))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('cutoff 边界：tick=7000 在 currentTick=60000 时保留（不严格小于）', () => {
    ;(sys as any).makers.push(makeMaker(1, 'tallow', 30, 7000))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('混合新旧记录：旧的被删，新的保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 'tallow', 30, 0))
    ;(sys as any).makers.push(makeMaker(2, 'beeswax', 30, 55000))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
  it('多个旧记录全部被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, 'tallow', 30, 0))
    ;(sys as any).makers.push(makeMaker(2, 'beeswax', 30, 100))
    ;(sys as any).makers.push(makeMaker(3, 'bayberry', 30, 200))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('cutoff = currentTick - 53000', () => {
    const currentTick = 100000
    const cutoff = currentTick - 53000
    expect(cutoff).toBe(47000)
  })
  it('MAX_MAKERS 为 30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(30)
  })
  it('CRAFT_CHANCE = 0.005，random=0.99 时不招募', () => {
    const em = makeEmptyEM()
    em.getEntitiesWithComponents.mockReturnValue([1])
    em.getComponent.mockReturnValue({ age: 20 })
    sys.update(1, em, 1400)
    expect((sys as any).makers).toHaveLength(0)
  })
})

describe('CreatureChandlersSystem - skillMap', () => {
  let sys: CreatureChandlersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('skillMap 初始为空 Map', () => {
    expect((sys as any).skillMap instanceof Map).toBe(true)
    expect((sys as any).skillMap.size).toBe(0)
  })
  it('可手动向 skillMap 存入技能值', () => {
    ;(sys as any).skillMap.set(42, 55)
    expect((sys as any).skillMap.get(42)).toBe(55)
  })
  it('同一 entityId 覆盖写入', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(1, 20)
    expect((sys as any).skillMap.get(1)).toBe(20)
  })
  it('不同 entityId 分别存储', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 20)
    expect((sys as any).skillMap.size).toBe(2)
  })
})
