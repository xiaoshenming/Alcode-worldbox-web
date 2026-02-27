import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureStakerSystem } from '../systems/CreatureStakerSystem'
import type { Staker } from '../systems/CreatureStakerSystem'

let nextId = 1
function makeSys(): CreatureStakerSystem { return new CreatureStakerSystem() }
function makeStaker(entityId: number): Staker {
  return { id: nextId++, entityId, stakingSkill: 70, deformControl: 65, jointStrength: 80, toolPrecision: 75, tick: 0 }
}

describe('CreatureStakerSystem.getStakers', () => {
  let sys: CreatureStakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铆接工', () => { expect(sys.getStakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).stakers.push(makeStaker(1))
    expect(sys.getStakers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).stakers.push(makeStaker(1))
    expect(sys.getStakers()).toBe((sys as any).stakers)
  })
  it('字段正确', () => {
    ;(sys as any).stakers.push(makeStaker(2))
    const s = sys.getStakers()[0]
    expect(s.stakingSkill).toBe(70)
    expect(s.jointStrength).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).stakers.push(makeStaker(1))
    ;(sys as any).stakers.push(makeStaker(2))
    expect(sys.getStakers()).toHaveLength(2)
  })
})
