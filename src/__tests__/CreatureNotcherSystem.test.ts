import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNotcherSystem } from '../systems/CreatureNotcherSystem'
import type { Notcher } from '../systems/CreatureNotcherSystem'

let nextId = 1
function makeSys(): CreatureNotcherSystem { return new CreatureNotcherSystem() }
function makeNotcher(entityId: number): Notcher {
  return { id: nextId++, entityId, notchingSkill: 70, cutDepth: 65, angleAccuracy: 80, bladeControl: 75, tick: 0 }
}

describe('CreatureNotcherSystem.getNotchers', () => {
  let sys: CreatureNotcherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无切口工', () => { expect(sys.getNotchers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).notchers.push(makeNotcher(1))
    expect(sys.getNotchers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).notchers.push(makeNotcher(1))
    expect(sys.getNotchers()).toBe((sys as any).notchers)
  })
  it('字段正确', () => {
    ;(sys as any).notchers.push(makeNotcher(3))
    const n = sys.getNotchers()[0]
    expect(n.notchingSkill).toBe(70)
    expect(n.angleAccuracy).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).notchers.push(makeNotcher(1))
    ;(sys as any).notchers.push(makeNotcher(2))
    expect(sys.getNotchers()).toHaveLength(2)
  })
})
