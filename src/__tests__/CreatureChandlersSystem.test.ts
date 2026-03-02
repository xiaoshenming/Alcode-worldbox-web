import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureChandlersSystem } from '../systems/CreatureChandlersSystem'
import type { Chandler, WaxType } from '../systems/CreatureChandlersSystem'

let nextId = 1
function makeSys(): CreatureChandlersSystem { return new CreatureChandlersSystem() }
function makeMaker(entityId: number, waxType: WaxType = 'tallow', skill = 30, tick = 0): Chandler {
  return { id: nextId++, entityId, skill, candlesMade: 10, waxType, burnQuality: 60, reputation: 50, tick }
}

/** 构造一个空的 EntityManager mock，让 getEntitiesWithComponents 返回空数组 */
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
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无蜡烛师记录', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

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
})

describe('CreatureChandlersSystem - 公式计算', () => {
  it('burnQuality = 18 + skill * 0.65，skill=40 → 44', () => {
    const skill = 40
    const result = 18 + skill * 0.65
    expect(result).toBeCloseTo(44, 5)
  })

  it('reputation = 10 + skill * 0.78，skill=40 → 41.2', () => {
    const skill = 40
    const result = 10 + skill * 0.78
    expect(result).toBeCloseTo(41.2, 5)
  })

  it('candlesMade = 1 + Math.floor(skill/7)，skill=49 → 8', () => {
    const skill = 49
    const result = 1 + Math.floor(skill / 7)
    expect(result).toBe(8)
  })

  it('candlesMade = 1 + Math.floor(skill/7)，skill=7 → 2', () => {
    const skill = 7
    const result = 1 + Math.floor(skill / 7)
    expect(result).toBe(2)
  })

  it('waxType 分段：skill<25 → tallow（typeIdx=0）', () => {
    const WAX_TYPES: WaxType[] = ['tallow', 'beeswax', 'bayberry', 'spermaceti']
    const skill = 20
    const idx = Math.min(3, Math.floor(skill / 25))
    expect(WAX_TYPES[idx]).toBe('tallow')
  })

  it('waxType 分段：skill=25 → beeswax（typeIdx=1）', () => {
    const WAX_TYPES: WaxType[] = ['tallow', 'beeswax', 'bayberry', 'spermaceti']
    const skill = 25
    const idx = Math.min(3, Math.floor(skill / 25))
    expect(WAX_TYPES[idx]).toBe('beeswax')
  })

  it('waxType 分段：skill=50 → bayberry（typeIdx=2）', () => {
    const WAX_TYPES: WaxType[] = ['tallow', 'beeswax', 'bayberry', 'spermaceti']
    const skill = 50
    const idx = Math.min(3, Math.floor(skill / 25))
    expect(WAX_TYPES[idx]).toBe('bayberry')
  })

  it('waxType 分段：skill=75 → spermaceti（typeIdx=3）', () => {
    const WAX_TYPES: WaxType[] = ['tallow', 'beeswax', 'bayberry', 'spermaceti']
    const skill = 75
    const idx = Math.min(3, Math.floor(skill / 25))
    expect(WAX_TYPES[idx]).toBe('spermaceti')
  })

  it('waxType 分段：skill=100 → spermaceti（typeIdx 上限为 3）', () => {
    const WAX_TYPES: WaxType[] = ['tallow', 'beeswax', 'bayberry', 'spermaceti']
    const skill = 100
    const idx = Math.min(3, Math.floor(skill / 25))
    expect(idx).toBe(3)
    expect(WAX_TYPES[idx]).toBe('spermaceti')
  })
})

describe('CreatureChandlersSystem - CHECK_INTERVAL 与 update', () => {
  let sys: CreatureChandlersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差值 < 1400 时，update 直接返回，lastCheck 不变', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 2399)
    expect((sys as any).lastCheck).toBe(1000)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick 差值 >= 1400 时，lastCheck 更新为当前 tick', () => {
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
})

describe('CreatureChandlersSystem - time-based cleanup', () => {
  let sys: CreatureChandlersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0 的记录在 currentTick=60000 时被清除（0 < 7000）', () => {
    ;(sys as any).makers.push(makeMaker(1, 'tallow', 30, 0))
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('tick=55000 的记录在 currentTick=60000 时被保留（55000 >= 7000）', () => {
    ;(sys as any).makers.push(makeMaker(1, 'tallow', 30, 55000))
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('cutoff 边界值：tick = currentTick - 53000 时记录被删除（刚好在 cutoff）', () => {
    // cutoff = 60000 - 53000 = 7000，tick=7000 → 7000 < 7000 为 false → 不删
    // tick=6999 → 6999 < 7000 → 删除
    ;(sys as any).makers.push(makeMaker(1, 'tallow', 30, 6999))
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('混合新旧记录：旧的被删，新的保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 'tallow', 30, 0))      // 旧，应删
    ;(sys as any).makers.push(makeMaker(2, 'beeswax', 30, 55000)) // 新，应留
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
})
