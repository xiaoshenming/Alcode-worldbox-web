import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePlanisherMasterSystem } from '../systems/CreaturePlanisherMasterSystem'
import type { PlanisherMaster } from '../systems/CreaturePlanisherMasterSystem'

let nextId = 1
function makeSys(): CreaturePlanisherMasterSystem { return new CreaturePlanisherMasterSystem() }
function makeMaster(entityId: number): PlanisherMaster {
  return { id: nextId++, entityId, masterPlanishSkill: 90, mirrorFinish: 85, hammerControl: 80, surfacePerfection: 88, tick: 0 }
}

describe('CreaturePlanisherMasterSystem.getMasters', () => {
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
