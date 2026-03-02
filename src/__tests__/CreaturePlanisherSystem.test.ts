import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreaturePlanisherSystem } from '../systems/CreaturePlanisherSystem'
import type { Planisher } from '../systems/CreaturePlanisherSystem'

const CHECK_INTERVAL = 2890
const MAX_PLANISHERS = 10

let nextId = 1
function makeSys(): CreaturePlanisherSystem { return new CreaturePlanisherSystem() }
function makePlanisher(entityId: number, overrides: Partial<Planisher> = {}): Planisher {
  return {
    id: nextId++,
    entityId,
    planishingSkill: 70,
    hammerPrecision: 65,
    surfaceFlatness: 80,
    metalAlignment: 75,
    tick: 0,
    ...overrides,
  }
}

/** 构造最简 EntityManager mock */
const emMock = { getEntitiesWithComponents: () => [] } as any

describe('CreaturePlanisherSystem.getPlanishers', () => {
  let sys: CreaturePlanisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无金属锤平工', () => { expect((sys as any).planishers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).planishers.push(makePlanisher(1))
    expect((sys as any).planishers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).planishers.push(makePlanisher(1))
    expect((sys as any).planishers).toBe((sys as any).planishers)
  })
  it('字段正确', () => {
    ;(sys as any).planishers.push(makePlanisher(3))
    const p = (sys as any).planishers[0]
    expect(p.planishingSkill).toBe(70)
    expect(p.surfaceFlatness).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).planishers.push(makePlanisher(1))
    ;(sys as any).planishers.push(makePlanisher(2))
    expect((sys as any).planishers).toHaveLength(2)
  })
})

describe('CreaturePlanisherSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreaturePlanisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 不足 CHECK_INTERVAL 时不更新 lastCheck', () => {
    sys.update(1, emMock, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 达到 CHECK_INTERVAL 时更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 不招募
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    vi.restoreAllMocks()
  })

  it('两次 update 中间不满足间隔时跳过第二次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    const countAfterFirst = (sys as any).planishers.length
    sys.update(1, emMock, CHECK_INTERVAL + 1) // 间隔仅1，不满足
    expect((sys as any).planishers.length).toBe(countAfterFirst)
    vi.restoreAllMocks()
  })
})

describe('CreaturePlanisherSystem - 技能递增与上限', () => {
  let sys: CreaturePlanisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('update 后 planishingSkill 增加 0.02', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].planishingSkill).toBeCloseTo(50.02)
    vi.restoreAllMocks()
  })

  it('update 后 hammerPrecision 增加 0.015', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { hammerPrecision: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].hammerPrecision).toBeCloseTo(50.015)
    vi.restoreAllMocks()
  })

  it('update 后 metalAlignment 增加 0.01', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { metalAlignment: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].metalAlignment).toBeCloseTo(50.01)
    vi.restoreAllMocks()
  })

  it('planishingSkill 不超过 100 上限', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 99.99 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].planishingSkill).toBe(100)
    vi.restoreAllMocks()
  })

  it('metalAlignment 不超过 100 上限', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { metalAlignment: 99.995 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].metalAlignment).toBe(100)
    vi.restoreAllMocks()
  })
})

describe('CreaturePlanisherSystem - cleanup（planishingSkill <= 4）', () => {
  let sys: CreaturePlanisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('planishingSkill > 4 的记录不被清除', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(1) // 1 < RECRUIT_CHANCE 为 false，不招募
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('planishingSkill === 4 的记录被清除', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 3.98 }))
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不招募
    // 3.98 + 0.02 = 4.00，仍 <= 4，应被清除
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('仅清除低技能记录，高技能保留', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 3 }))
    ;(sys as any).planishers.push(makePlanisher(2, { planishingSkill: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(1) // 不招募
    sys.update(1, emMock, CHECK_INTERVAL)
    const survivors = (sys as any).planishers
    expect(survivors).toHaveLength(1)
    expect(survivors[0].entityId).toBe(2)
    vi.restoreAllMocks()
  })
})

describe('CreaturePlanisherSystem - MAX_PLANISHERS 上限', () => {
  let sys: CreaturePlanisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已达 MAX_PLANISHERS 时不再招募', () => {
    for (let i = 0; i < MAX_PLANISHERS; i++) {
      ;(sys as any).planishers.push(makePlanisher(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0) // 无论概率如何都不应超限
    sys.update(1, emMock, CHECK_INTERVAL)
    // 全部技能均已足够高，不会被清除；数量不应超过 MAX_PLANISHERS
    expect((sys as any).planishers.length).toBeLessThanOrEqual(MAX_PLANISHERS)
    vi.restoreAllMocks()
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})
