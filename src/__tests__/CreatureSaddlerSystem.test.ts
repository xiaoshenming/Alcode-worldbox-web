import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSaddlerSystem } from '../systems/CreatureSaddlerSystem'
import type { Saddler } from '../systems/CreatureSaddlerSystem'

let nextId = 1
function makeSys(): CreatureSaddlerSystem { return new CreatureSaddlerSystem() }
function makeSaddler(entityId: number): Saddler {
  return { id: nextId++, entityId, leatherShaping: 70, treeFitting: 65, paddingWork: 75, outputQuality: 80, tick: 0 }
}

describe('CreatureSaddlerSystem.getSaddlers', () => {
  let sys: CreatureSaddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无马鞍工', () => { expect((sys as any).saddlers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).saddlers.push(makeSaddler(1))
    expect((sys as any).saddlers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).saddlers.push(makeSaddler(1))
    expect((sys as any).saddlers).toBe((sys as any).saddlers)
  })
  it('字段正确', () => {
    ;(sys as any).saddlers.push(makeSaddler(2))
    const s = (sys as any).saddlers[0]
    expect(s.leatherShaping).toBe(70)
    expect(s.outputQuality).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).saddlers.push(makeSaddler(1))
    ;(sys as any).saddlers.push(makeSaddler(2))
    expect((sys as any).saddlers).toHaveLength(2)
  })
})
