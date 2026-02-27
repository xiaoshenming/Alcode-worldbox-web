import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureStamperSystem } from '../systems/CreatureStamperSystem'
import type { Stamper } from '../systems/CreatureStamperSystem'

let nextId = 1
function makeSys(): CreatureStamperSystem { return new CreatureStamperSystem() }
function makeStamper(entityId: number): Stamper {
  return { id: nextId++, entityId, stampingSkill: 70, pressAlignment: 65, dieSelection: 80, outputConsistency: 75, tick: 0 }
}

describe('CreatureStamperSystem.getStampers', () => {
  let sys: CreatureStamperSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无冲压工', () => { expect(sys.getStampers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).stampers.push(makeStamper(1))
    expect(sys.getStampers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).stampers.push(makeStamper(1))
    expect(sys.getStampers()).toBe((sys as any).stampers)
  })
  it('字段正确', () => {
    ;(sys as any).stampers.push(makeStamper(2))
    const s = sys.getStampers()[0]
    expect(s.stampingSkill).toBe(70)
    expect(s.dieSelection).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).stampers.push(makeStamper(1))
    ;(sys as any).stampers.push(makeStamper(2))
    expect(sys.getStampers()).toHaveLength(2)
  })
})
