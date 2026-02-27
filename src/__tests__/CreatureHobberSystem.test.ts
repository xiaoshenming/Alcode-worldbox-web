import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHobberSystem } from '../systems/CreatureHobberSystem'
import type { Hobber } from '../systems/CreatureHobberSystem'

let nextId = 1
function makeSys(): CreatureHobberSystem { return new CreatureHobberSystem() }
function makeHobber(entityId: number): Hobber {
  return { id: nextId++, entityId, hobbingSkill: 70, gearCutting: 65, splineForming: 60, indexAccuracy: 75, tick: 0 }
}

describe('CreatureHobberSystem.getHobbers', () => {
  let sys: CreatureHobberSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无滚齿工', () => { expect(sys.getHobbers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).hobbers.push(makeHobber(1))
    expect(sys.getHobbers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).hobbers.push(makeHobber(1))
    expect(sys.getHobbers()).toBe((sys as any).hobbers)
  })
  it('字段正确', () => {
    ;(sys as any).hobbers.push(makeHobber(3))
    const h = sys.getHobbers()[0]
    expect(h.hobbingSkill).toBe(70)
    expect(h.indexAccuracy).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).hobbers.push(makeHobber(1))
    ;(sys as any).hobbers.push(makeHobber(2))
    expect(sys.getHobbers()).toHaveLength(2)
  })
})
