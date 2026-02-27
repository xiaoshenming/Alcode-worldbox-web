import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSawyerSystem } from '../systems/CreatureSawyerSystem'
import type { Sawyer } from '../systems/CreatureSawyerSystem'

let nextId = 1
function makeSys(): CreatureSawyerSystem { return new CreatureSawyerSystem() }
function makeSawyer(entityId: number): Sawyer {
  return { id: nextId++, entityId, sawingSkill: 70, timberGrading: 65, bladeControl: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureSawyerSystem.getSawyers', () => {
  let sys: CreatureSawyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锯木工', () => { expect(sys.getSawyers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).sawyers.push(makeSawyer(1))
    expect(sys.getSawyers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).sawyers.push(makeSawyer(1))
    expect(sys.getSawyers()).toBe((sys as any).sawyers)
  })
  it('字段正确', () => {
    ;(sys as any).sawyers.push(makeSawyer(2))
    const s = sys.getSawyers()[0]
    expect(s.sawingSkill).toBe(70)
    expect(s.bladeControl).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).sawyers.push(makeSawyer(1))
    ;(sys as any).sawyers.push(makeSawyer(2))
    expect(sys.getSawyers()).toHaveLength(2)
  })
})
