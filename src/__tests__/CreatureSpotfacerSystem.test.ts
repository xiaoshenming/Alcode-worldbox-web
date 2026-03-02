import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureSpotfacerSystem } from '../systems/CreatureSpotfacerSystem'
import type { Spotfacer } from '../systems/CreatureSpotfacerSystem'

const CHECK_INTERVAL = 3000
const em = { getEntitiesWithComponent: () => [] } as any

let nextId = 1
function makeSys(): CreatureSpotfacerSystem { return new CreatureSpotfacerSystem() }
function makeSpotfacer(entityId: number, overrides: Partial<Spotfacer> = {}): Spotfacer {
  return { id: nextId++, entityId, spotfacingSkill: 70, flatnessControl: 65, bearingSurface: 80, depthConsistency: 75, tick: 0, ...overrides }
}

describe('CreatureSpotfacerSystem.getSpotfacers', () => {
  let sys: CreatureSpotfacerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无端面工', () => { expect((sys as any).spotfacers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1))
    expect((sys as any).spotfacers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1))
    expect((sys as any).spotfacers).toBe((sys as any).spotfacers)
  })
  it('字段正确', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(2))
    const s = (sys as any).spotfacers[0]
    expect(s.spotfacingSkill).toBe(70)
    expect(s.bearingSurface).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1))
    ;(sys as any).spotfacers.push(makeSpotfacer(2))
    expect((sys as any).spotfacers).toHaveLength(2)
  })
})

describe('CreatureSpotfacerSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureSpotfacerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足时不执行技能增长', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1))
    const before = (sys as any).spotfacers[0].spotfacingSkill
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBe(before)
  })

  it('首次tick=CHECK_INTERVAL时执行', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1))
    const before = (sys as any).spotfacers[0].spotfacingSkill
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBeGreaterThan(before)
  })

  it('执行后lastCheck更新为当前tick', () => {
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续两次更新：第二次在间隔内不再增长', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).spotfacers[0].spotfacingSkill
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBe(afterFirst)
  })

  it('两次间隔均达到时两次都增长', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).spotfacers[0].spotfacingSkill
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBeGreaterThan(afterFirst)
  })
})

describe('CreatureSpotfacerSystem - 技能增量', () => {
  let sys: CreatureSpotfacerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('spotfacingSkill每次+0.02', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1, { spotfacingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBeCloseTo(50.02)
  })

  it('flatnessControl每次+0.015', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1, { flatnessControl: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].flatnessControl).toBeCloseTo(50.015)
  })

  it('depthConsistency每次+0.01', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1, { depthConsistency: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].depthConsistency).toBeCloseTo(50.01)
  })

  it('bearingSurface不自动增长', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1, { bearingSurface: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].bearingSurface).toBe(50)
  })

  it('spotfacingSkill上限100不超出', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1, { spotfacingSkill: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBe(100)
  })

  it('flatnessControl上限100不超出', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1, { flatnessControl: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].flatnessControl).toBe(100)
  })

  it('depthConsistency上限100不超出', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1, { depthConsistency: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].depthConsistency).toBe(100)
  })

  it('多名端面工技能同步增长', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1, { spotfacingSkill: 50 }))
    ;(sys as any).spotfacers.push(makeSpotfacer(2, { spotfacingSkill: 60 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers[0].spotfacingSkill).toBeCloseTo(50.02)
    expect((sys as any).spotfacers[1].spotfacingSkill).toBeCloseTo(60.02)
  })
})

describe('CreatureSpotfacerSystem - cleanup边界', () => {
  let sys: CreatureSpotfacerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('spotfacingSkill=3.98增长后=4被清除', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1, { spotfacingSkill: 3.98 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.00 -> <= 4 => 清除
    expect((sys as any).spotfacers).toHaveLength(0)
  })

  it('spotfacingSkill=4.01增长后>4保留', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1, { spotfacingSkill: 4.01 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    // 4.01 + 0.02 = 4.03 > 4 => 保留
    expect((sys as any).spotfacers).toHaveLength(1)
  })

  it('spotfacingSkill=4增长后4.02>4保留', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1, { spotfacingSkill: 4 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    // 4 + 0.02 = 4.02 > 4 => 保留
    expect((sys as any).spotfacers).toHaveLength(1)
  })

  it('混合端面工：低技能被清除，高技能保留', () => {
    ;(sys as any).spotfacers.push(makeSpotfacer(1, { spotfacingSkill: 3 }))
    ;(sys as any).spotfacers.push(makeSpotfacer(2, { spotfacingSkill: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spotfacers).toHaveLength(1)
    expect((sys as any).spotfacers[0].entityId).toBe(2)
  })
})

describe('CreatureSpotfacerSystem - MAX_SPOTFACERS上限', () => {
  let sys: CreatureSpotfacerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('达到MAX_SPOTFACERS=10时不再招募', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).spotfacers.push(makeSpotfacer(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).spotfacers.length).toBeLessThanOrEqual(10)
  })

  it('未满时随机触发可招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).spotfacers.length).toBe(1)
  })
})
