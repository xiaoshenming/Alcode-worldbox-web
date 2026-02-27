import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSuperstitionSystem } from '../systems/CreatureSuperstitionSystem'
import type { Superstition, SuperstitionType } from '../systems/CreatureSuperstitionSystem'

let nextId = 1
function makeSys(): CreatureSuperstitionSystem { return new CreatureSuperstitionSystem() }
function makeSuperstition(type: SuperstitionType, positive: boolean): Superstition {
  return { id: nextId++, type, x: 10, y: 20, radius: 5, strength: 60, originTick: 0, believers: new Set([1, 2]), positive, decayRate: 0.1 }
}

describe('CreatureSuperstitionSystem getters', () => {
  let sys: CreatureSuperstitionSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无迷信', () => { expect(sys.getSuperstitions()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).superstitions.push(makeSuperstition('lucky_spot', true))
    expect(sys.getSuperstitions()[0].type).toBe('lucky_spot')
  })
  it('返回内部引用', () => {
    ;(sys as any).superstitions.push(makeSuperstition('cursed_ground', false))
    expect(sys.getSuperstitions()).toBe((sys as any).superstitions)
  })
  it('getPositiveSuperstitions只返回positive=true的', () => {
    ;(sys as any).superstitions.push(makeSuperstition('lucky_spot', true))
    ;(sys as any).superstitions.push(makeSuperstition('cursed_ground', false))
    ;(sys as any).superstitions.push(makeSuperstition('sacred_tree', true))
    const pos = sys.getPositiveSuperstitions()
    expect(pos).toHaveLength(2)
    pos.forEach(s => expect(s.positive).toBe(true))
  })
  it('getNegativeSuperstitions只返回positive=false的', () => {
    ;(sys as any).superstitions.push(makeSuperstition('lucky_spot', true))
    ;(sys as any).superstitions.push(makeSuperstition('forbidden_path', false))
    const neg = sys.getNegativeSuperstitions()
    expect(neg).toHaveLength(1)
    expect(neg[0].type).toBe('forbidden_path')
  })
  it('支持所有6种迷信类型', () => {
    const types: SuperstitionType[] = ['lucky_spot', 'cursed_ground', 'sacred_tree', 'omen_bird', 'forbidden_path', 'blessed_water']
    types.forEach((t, i) => { ;(sys as any).superstitions.push(makeSuperstition(t, i % 2 === 0)) })
    expect(sys.getSuperstitions()).toHaveLength(6)
  })
})
