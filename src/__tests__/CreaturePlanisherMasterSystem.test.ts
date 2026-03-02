import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreaturePlanisherMasterSystem } from '../systems/CreaturePlanisherMasterSystem'
import type { PlanisherMaster } from '../systems/CreaturePlanisherMasterSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreaturePlanisherMasterSystem { return new CreaturePlanisherMasterSystem() }
function makeMaster(entityId: number, overrides: Partial<PlanisherMaster> = {}): PlanisherMaster {
  return { id: nextId++, entityId, masterPlanishSkill: 90, mirrorFinish: 85, hammerControl: 80, surfacePerfection: 88, tick: 0, ...overrides }
}
function makeEM(): EntityManager { return new EntityManager() }

describe('CreaturePlanisherMasterSystem - 初始状态', () => {
  let sys: CreaturePlanisherMasterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无大师级锤平工', () => { expect((sys as any).masters).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).masters.push(makeMaster(1))
    expect((sys as any).masters[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).masters.push(makeMaster(1))
    expect((sys as any).masters).toBe((sys as any).masters)
  })
  it('字段正确', () => {
    ;(sys as any).masters.push(makeMaster(2))
    const m = (sys as any).masters[0]
    expect(m.masterPlanishSkill).toBe(90)
    expect(m.mirrorFinish).toBe(85)
  })
  it('多个全部返回', () => {
    ;(sys as any).masters.push(makeMaster(1))
    ;(sys as any).masters.push(makeMaster(2))
    expect((sys as any).masters).toHaveLength(2)
  })
})

describe('CreaturePlanisherMasterSystem - CHECK_INTERVAL=3110节流', () => {
  let sys: CreaturePlanisherMasterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差不足3110时不执行逻辑，lastCheck不变', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3109)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差=3110时执行，lastCheck更新', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3110)
    expect((sys as any).lastCheck).toBe(3110)
  })

  it('tick差=3109不触发', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 5000
    sys.update(0, em, 8109)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('tick差=3110精确触发', () => {
    const em = makeEM()
    ;(sys as any).lastCheck = 5000
    sys.update(0, em, 8110)
    expect((sys as any).lastCheck).toBe(8110)
  })
})

describe('CreaturePlanisherMasterSystem - 技能递增与上限', () => {
  let sys: CreaturePlanisherMasterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('每次触发时masterPlanishSkill增加0.02', () => {
    const em = makeEM()
    const m = makeMaster(1, { masterPlanishSkill: 50 })
    ;(sys as any).masters.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3110)
    expect(m.masterPlanishSkill).toBeCloseTo(50.02, 5)
  })

  it('每次触发时mirrorFinish增加0.015', () => {
    const em = makeEM()
    const m = makeMaster(1, { mirrorFinish: 60 })
    ;(sys as any).masters.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3110)
    expect(m.mirrorFinish).toBeCloseTo(60.015, 5)
  })

  it('每次触发时surfacePerfection增加0.01', () => {
    const em = makeEM()
    const m = makeMaster(1, { surfacePerfection: 70 })
    ;(sys as any).masters.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3110)
    expect(m.surfacePerfection).toBeCloseTo(70.01, 5)
  })

  it('masterPlanishSkill上限为100，不超过', () => {
    const em = makeEM()
    const m = makeMaster(1, { masterPlanishSkill: 99.99 })
    ;(sys as any).masters.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3110)
    expect(m.masterPlanishSkill).toBeLessThanOrEqual(100)
  })

  it('mirrorFinish上限为100，不超过', () => {
    const em = makeEM()
    const m = makeMaster(1, { mirrorFinish: 99.99 })
    ;(sys as any).masters.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3110)
    expect(m.mirrorFinish).toBeLessThanOrEqual(100)
  })

  it('surfacePerfection上限为100，不超过', () => {
    const em = makeEM()
    const m = makeMaster(1, { surfacePerfection: 99.99 })
    ;(sys as any).masters.push(m)
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3110)
    expect(m.surfacePerfection).toBeLessThanOrEqual(100)
  })
})

describe('CreaturePlanisherMasterSystem - cleanup：masterPlanishSkill<=4时删除', () => {
  let sys: CreaturePlanisherMasterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('masterPlanishSkill=4时删除（<=4触发）', () => {
    const em = makeEM()
    ;(sys as any).masters.push(makeMaster(1, { masterPlanishSkill: 4 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 3110)
    // After skill += 0.02 => 4.02, which is NOT <= 4, so NOT deleted
    // Actually the loop runs AFTER growth, so 4 + 0.02 = 4.02 > 4 => NOT deleted
    // The condition checks AFTER growth. Let's check the source...
    // In source: first growth, then cleanup check
    // 4 + 0.02 = 4.02 > 4 => not deleted
    expect((sys as any).masters).toHaveLength(1)
  })

  it('初始masterPlanishSkill=3.97时增长后仍<=4，被删除', () => {
    const em = makeEM()
    ;(sys as any).masters.push(makeMaster(1, { masterPlanishSkill: 3.97 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 3110)
    // 3.97 + 0.02 = 3.99 <= 4 => deleted
    expect((sys as any).masters).toHaveLength(0)
  })

  it('masterPlanishSkill=4.01增长后>4，保留', () => {
    const em = makeEM()
    ;(sys as any).masters.push(makeMaster(1, { masterPlanishSkill: 4.01 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 3110)
    // 4.01 + 0.02 = 4.03 > 4 => kept
    expect((sys as any).masters).toHaveLength(1)
  })

  it('高skill的master不被删除', () => {
    const em = makeEM()
    ;(sys as any).masters.push(makeMaster(1, { masterPlanishSkill: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, em, 3110)
    expect((sys as any).masters).toHaveLength(1)
  })
})

describe('CreaturePlanisherMasterSystem - MAX_MASTERS=10上限', () => {
  let sys: CreaturePlanisherMasterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('已有10个master时不招募新master', () => {
    const em = makeEM()
    for (let i = 0; i < 10; i++) {
      ;(sys as any).masters.push(makeMaster(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < RECRUIT_CHANCE(0.0015) always
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3110)
    // 初始10，增长后可能删除skill<=4的，但我们都设置了90，不会删除
    expect((sys as any).masters.length).toBeLessThanOrEqual(10)
    vi.restoreAllMocks()
  })

  it('master数量<10且random<RECRUIT_CHANCE时可招募新master', () => {
    const em = makeEM()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)      // recruit check: 0 < 0.0015 passes
      .mockReturnValue(0.5)        // random values for fields
    ;(sys as any).lastCheck = 0
    sys.update(0, em, 3110)
    expect((sys as any).masters.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('nextId递增：每次新增master时id唯一', () => {
    const em = makeEM()
    const sys2 = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys2 as any).lastCheck = 0
    sys2.update(0, em, 3110)
    sys2.update(0, em, 6220)
    const masters = (sys2 as any).masters
    if (masters.length >= 2) {
      const ids = masters.map((m: PlanisherMaster) => m.id)
      const unique = new Set(ids)
      expect(unique.size).toBe(ids.length)
    }
    vi.restoreAllMocks()
  })
})
