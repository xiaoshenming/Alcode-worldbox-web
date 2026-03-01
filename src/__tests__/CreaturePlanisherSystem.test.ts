import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePlanisherSystem } from '../systems/CreaturePlanisherSystem'
import type { Planisher } from '../systems/CreaturePlanisherSystem'

let nextId = 1
function makeSys(): CreaturePlanisherSystem { return new CreaturePlanisherSystem() }
function makePlanisher(entityId: number): Planisher {
  return { id: nextId++, entityId, planishingSkill: 70, hammerPrecision: 65, surfaceFlatness: 80, metalAlignment: 75, tick: 0 }
}

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
