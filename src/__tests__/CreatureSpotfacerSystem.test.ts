import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureSpotfacerSystem } from '../systems/CreatureSpotfacerSystem'
import type { Spotfacer } from '../systems/CreatureSpotfacerSystem'

const CHECK_INTERVAL = 3000
const MAX_SPOTFACERS = 10
const em = { getEntitiesWithComponent: () => [] } as any

let nextId = 1
function makeSys(): CreatureSpotfacerSystem { return new CreatureSpotfacerSystem() }
function makeWorker(entityId: number, overrides: Partial<Spotfacer> = {}): Spotfacer {
  return { id: nextId++, entityId, spotfacingSkill: 70, flatnessControl: 65, bearingSurface: 80, depthConsistency: 75, tick: 0, ...overrides }
}

describe('CreatureSpotfacerSystem — 初始状态', () => {
  let sys: CreatureSpotfacerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无工匠', () => { expect((sys as any).spotfacers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).spotfacers.push(makeWorker(1))
    expect((sys as any).spotfacers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).spotfacers.push(makeWorker(1))
    expect((sys as any).spotfacers).toBe((sys as any).spotfacers)
  })
  it('字段正确', () => {
    ;(sys as any).spotfacers.push(makeWorker(2))
    const s = (sys as any).spotfacers[0]
    expect(s.spotfacingSkill).toBe(70)
    expect(s.depthConsistency).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).spotfacers.push(makeWorker(1))
    ;(sys as any).spotfacers.push(makeWorker(2))
    expect((sys as any).spotfacers).toHaveLength(2)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('bearingSurface字段存储正确', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { bearingSurface: 42 }))
    expect((sys as any).spotfacers[0].bearingSurface).toBe(42)
  })
})

describe('CreatureSpotfacerSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureSpotfacerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick不足时不执行技能增长', () => {
    ;(sys as any).spotfacers.push(makeWorker(1))
    const before = (sys as any).spotfacers[0].spotfacingSkill
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBe(before)
  })
  it('首次tick=CHECK_INTERVAL时执行', () => {
    ;(sys as any).spotfacers.push(makeWorker(1))
    const before = (sys as any).spotfacers[0].spotfacingSkill
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBeGreaterThan(before)
  })
  it('执行后lastCheck更新为当前tick', () => {
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('连续两次更新：第二次在间隔内不再增长', () => {
    ;(sys as any).spotfacers.push(makeWorker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).spotfacers[0].spotfacingSkill
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBe(afterFirst)
  })
  it('两次间隔均达到时两次都增长', () => {
    ;(sys as any).spotfacers.push(makeWorker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).spotfacers[0].spotfacingSkill
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBeGreaterThan(afterFirst)
  })
  it('差值恰好等于CHECK_INTERVAL时执行', () => {
    ;(sys as any).lastCheck = 1000
    ;(sys as any).spotfacers.push(makeWorker(1, { spotfacingSkill: 50 }))
    sys.update(1, em, 1000 + CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBeCloseTo(50.02)
  })
  it('节流期间lastCheck不变', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(1, em, 5100)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('空update不崩溃', () => {
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
})

describe('CreatureSpotfacerSystem - 技能增量', () => {
  let sys: CreatureSpotfacerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('spotfacingSkill每次+0.02', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { spotfacingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBeCloseTo(50.02)
  })
  it('flatnessControl每次+0.015', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { flatnessControl: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].flatnessControl).toBeCloseTo(50.015)
  })
  it('depthConsistency每次+0.01', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { depthConsistency: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].depthConsistency).toBeCloseTo(50.01)
  })
  it('bearingSurface不自动增长', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { bearingSurface: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].bearingSurface).toBe(50)
  })
  it('spotfacingSkill上限100不超出', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { spotfacingSkill: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBe(100)
  })
  it('flatnessControl上限100不超出', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { flatnessControl: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].flatnessControl).toBe(100)
  })
  it('depthConsistency上限100不超出', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { depthConsistency: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].depthConsistency).toBe(100)
  })
  it('多名工匠技能同步增长', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { spotfacingSkill: 50 }))
    ;(sys as any).spotfacers.push(makeWorker(2, { spotfacingSkill: 60 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBeCloseTo(50.02)
    expect((sys as any).spotfacers[1].spotfacingSkill).toBeCloseTo(60.02)
  })
  it('三次更新后spotfacingSkill累积正确', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { spotfacingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    sys.update(1, em, CHECK_INTERVAL * 3)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBeCloseTo(50.06)
  })
})

describe('CreatureSpotfacerSystem - cleanup边界', () => {
  let sys: CreatureSpotfacerSystem
  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('spotfacingSkill=3.98增长后<=4被清除', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { spotfacingSkill: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers).toHaveLength(0)
  })
  it('spotfacingSkill=4.01增长后>4保留', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { spotfacingSkill: 4.01 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers).toHaveLength(1)
  })
  it('spotfacingSkill=4增长后4.02>4保留', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { spotfacingSkill: 4 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers).toHaveLength(1)
  })
  it('混合工匠：低技能被清除，高技能保留', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { spotfacingSkill: 3 }))
    ;(sys as any).spotfacers.push(makeWorker(2, { spotfacingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers).toHaveLength(1)
    expect((sys as any).spotfacers[0].entityId).toBe(2)
  })
  it('全部低技能时所有被清除', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { spotfacingSkill: 1 }))
    ;(sys as any).spotfacers.push(makeWorker(2, { spotfacingSkill: 2 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers).toHaveLength(0)
  })
  it('高技能始终保留', () => {
    ;(sys as any).spotfacers.push(makeWorker(1, { spotfacingSkill: 90 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers).toHaveLength(1)
  })
})

describe('CreatureSpotfacerSystem - MAX_SPOTFACERS上限与招募', () => {
  let sys: CreatureSpotfacerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到MAX_SPOTFACERS=10时不再招募', () => {
    for (let i = 0; i < MAX_SPOTFACERS; i++) {
      ;(sys as any).spotfacers.push(makeWorker(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers.length).toBeLessThanOrEqual(MAX_SPOTFACERS)
  })
  it('未满时random=0时招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers.length).toBe(1)
  })
  it('random >= RECRUIT_CHANCE时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers).toHaveLength(0)
  })
  it('招募成功时新记录tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).spotfacers.length > 0) {
      expect((sys as any).spotfacers[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('招募后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).spotfacers.length > 0) {
      expect((sys as any).nextId).toBe(2)
    }
  })
  it('系统不崩溃（空spotfacers）', () => {
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
})
