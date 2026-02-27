import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRopeWalkerSystem } from '../systems/CreatureRopeWalkerSystem'
import type { RopeWalker } from '../systems/CreatureRopeWalkerSystem'

let nextId = 1
function makeSys(): CreatureRopeWalkerSystem { return new CreatureRopeWalkerSystem() }
function makeWalker(entityId: number): RopeWalker {
  return { id: nextId++, entityId, fiberBraiding: 70, tensileStrength: 65, knotTying: 80, outputQuality: 75, tick: 0 }
}

describe('CreatureRopeWalkerSystem.getRopeWalkers', () => {
  let sys: CreatureRopeWalkerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无绳索行者', () => { expect(sys.getRopeWalkers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1))
    expect(sys.getRopeWalkers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1))
    expect(sys.getRopeWalkers()).toBe((sys as any).ropeWalkers)
  })
  it('字段正确', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(2))
    const w = sys.getRopeWalkers()[0]
    expect(w.fiberBraiding).toBe(70)
    expect(w.knotTying).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).ropeWalkers.push(makeWalker(1))
    ;(sys as any).ropeWalkers.push(makeWalker(2))
    expect(sys.getRopeWalkers()).toHaveLength(2)
  })
})
