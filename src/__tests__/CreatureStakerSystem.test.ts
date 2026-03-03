import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureStakerSystem } from '../systems/CreatureStakerSystem'
import type { Staker } from '../systems/CreatureStakerSystem'

const CHECK_INTERVAL = 3100
const MAX_STAKERS = 10
const em = { getEntitiesWithComponent: () => [] } as any

let nextId = 1
function makeSys(): CreatureStakerSystem { return new CreatureStakerSystem() }
function makeWorker(entityId: number, overrides: Partial<Staker> = {}): Staker {
  return { id: nextId++, entityId, stakingSkill: 70, deformControl: 65, jointStrength: 80, toolPrecision: 75, tick: 0, ...overrides }
}

describe('CreatureStakerSystem — 初始状态', () => {
  let sys: CreatureStakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无工匠', () => { expect((sys as any).stakers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).stakers.push(makeWorker(1))
    expect((sys as any).stakers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).stakers.push(makeWorker(1))
    expect((sys as any).stakers).toBe((sys as any).stakers)
  })
  it('字段正确', () => {
    ;(sys as any).stakers.push(makeWorker(2))
    const s = (sys as any).stakers[0]
    expect(s.stakingSkill).toBe(70)
    expect(s.toolPrecision).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).stakers.push(makeWorker(1))
    ;(sys as any).stakers.push(makeWorker(2))
    expect((sys as any).stakers).toHaveLength(2)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('jointStrength字段存储正确', () => {
    ;(sys as any).stakers.push(makeWorker(1, { jointStrength: 42 }))
    expect((sys as any).stakers[0].jointStrength).toBe(42)
  })
})

describe('CreatureStakerSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureStakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick不足时不执行技能增长', () => {
    ;(sys as any).stakers.push(makeWorker(1))
    const before = (sys as any).stakers[0].stakingSkill
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).stakers[0].stakingSkill).toBe(before)
  })
  it('首次tick=CHECK_INTERVAL时执行', () => {
    ;(sys as any).stakers.push(makeWorker(1))
    const before = (sys as any).stakers[0].stakingSkill
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].stakingSkill).toBeGreaterThan(before)
  })
  it('执行后lastCheck更新为当前tick', () => {
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('连续两次更新：第二次在间隔内不再增长', () => {
    ;(sys as any).stakers.push(makeWorker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).stakers[0].stakingSkill
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).stakers[0].stakingSkill).toBe(afterFirst)
  })
  it('两次间隔均达到时两次都增长', () => {
    ;(sys as any).stakers.push(makeWorker(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).stakers[0].stakingSkill
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).stakers[0].stakingSkill).toBeGreaterThan(afterFirst)
  })
  it('差值恰好等于CHECK_INTERVAL时执行', () => {
    ;(sys as any).lastCheck = 1000
    ;(sys as any).stakers.push(makeWorker(1, { stakingSkill: 50 }))
    sys.update(1, em, 1000 + CHECK_INTERVAL)
    expect((sys as any).stakers[0].stakingSkill).toBeCloseTo(50.02)
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

describe('CreatureStakerSystem - 技能增量', () => {
  let sys: CreatureStakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('stakingSkill每次+0.02', () => {
    ;(sys as any).stakers.push(makeWorker(1, { stakingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].stakingSkill).toBeCloseTo(50.02)
  })
  it('deformControl每次+0.015', () => {
    ;(sys as any).stakers.push(makeWorker(1, { deformControl: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].deformControl).toBeCloseTo(50.015)
  })
  it('toolPrecision每次+0.01', () => {
    ;(sys as any).stakers.push(makeWorker(1, { toolPrecision: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].toolPrecision).toBeCloseTo(50.01)
  })
  it('jointStrength不自动增长', () => {
    ;(sys as any).stakers.push(makeWorker(1, { jointStrength: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].jointStrength).toBe(50)
  })
  it('stakingSkill上限100不超出', () => {
    ;(sys as any).stakers.push(makeWorker(1, { stakingSkill: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].stakingSkill).toBe(100)
  })
  it('deformControl上限100不超出', () => {
    ;(sys as any).stakers.push(makeWorker(1, { deformControl: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].deformControl).toBe(100)
  })
  it('toolPrecision上限100不超出', () => {
    ;(sys as any).stakers.push(makeWorker(1, { toolPrecision: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].toolPrecision).toBe(100)
  })
  it('多名工匠技能同步增长', () => {
    ;(sys as any).stakers.push(makeWorker(1, { stakingSkill: 50 }))
    ;(sys as any).stakers.push(makeWorker(2, { stakingSkill: 60 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers[0].stakingSkill).toBeCloseTo(50.02)
    expect((sys as any).stakers[1].stakingSkill).toBeCloseTo(60.02)
  })
  it('三次更新后stakingSkill累积正确', () => {
    ;(sys as any).stakers.push(makeWorker(1, { stakingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    sys.update(1, em, CHECK_INTERVAL * 3)
    expect((sys as any).stakers[0].stakingSkill).toBeCloseTo(50.06)
  })
})

describe('CreatureStakerSystem - cleanup边界', () => {
  let sys: CreatureStakerSystem
  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('stakingSkill=3.98增长后<=4被清除', () => {
    ;(sys as any).stakers.push(makeWorker(1, { stakingSkill: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers).toHaveLength(0)
  })
  it('stakingSkill=4.01增长后>4保留', () => {
    ;(sys as any).stakers.push(makeWorker(1, { stakingSkill: 4.01 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers).toHaveLength(1)
  })
  it('stakingSkill=4增长后4.02>4保留', () => {
    ;(sys as any).stakers.push(makeWorker(1, { stakingSkill: 4 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers).toHaveLength(1)
  })
  it('混合工匠：低技能被清除，高技能保留', () => {
    ;(sys as any).stakers.push(makeWorker(1, { stakingSkill: 3 }))
    ;(sys as any).stakers.push(makeWorker(2, { stakingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers).toHaveLength(1)
    expect((sys as any).stakers[0].entityId).toBe(2)
  })
  it('全部低技能时所有被清除', () => {
    ;(sys as any).stakers.push(makeWorker(1, { stakingSkill: 1 }))
    ;(sys as any).stakers.push(makeWorker(2, { stakingSkill: 2 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers).toHaveLength(0)
  })
  it('高技能始终保留', () => {
    ;(sys as any).stakers.push(makeWorker(1, { stakingSkill: 90 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers).toHaveLength(1)
  })
})

describe('CreatureStakerSystem - MAX_STAKERS上限与招募', () => {
  let sys: CreatureStakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到MAX_STAKERS=10时不再招募', () => {
    for (let i = 0; i < MAX_STAKERS; i++) {
      ;(sys as any).stakers.push(makeWorker(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers.length).toBeLessThanOrEqual(MAX_STAKERS)
  })
  it('未满时random=0时招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers.length).toBe(1)
  })
  it('random >= RECRUIT_CHANCE时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).stakers).toHaveLength(0)
  })
  it('招募成功时新记录tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).stakers.length > 0) {
      expect((sys as any).stakers[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('招募后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    if ((sys as any).stakers.length > 0) {
      expect((sys as any).nextId).toBe(2)
    }
  })
  it('系统不崩溃（空stakers）', () => {
    expect(() => sys.update(1, em, CHECK_INTERVAL)).not.toThrow()
  })
})
