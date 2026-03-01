import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureKnurlerSystem } from '../systems/CreatureKnurlerSystem'
import type { Knurler } from '../systems/CreatureKnurlerSystem'

let nextId = 1
function makeSys(): CreatureKnurlerSystem { return new CreatureKnurlerSystem() }
function makeKnurler(entityId: number): Knurler {
  return { id: nextId++, entityId, knurlingSkill: 70, patternPrecision: 65, surfaceTexture: 80, gripQuality: 75, tick: 0 }
}

describe('CreatureKnurlerSystem.getKnurlers', () => {
  let sys: CreatureKnurlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无滚花工', () => { expect((sys as any).knurlers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).knurlers.push(makeKnurler(1))
    expect((sys as any).knurlers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).knurlers.push(makeKnurler(1))
    expect((sys as any).knurlers).toBe((sys as any).knurlers)
  })
  it('字段正确', () => {
    ;(sys as any).knurlers.push(makeKnurler(3))
    const k = (sys as any).knurlers[0]
    expect(k.knurlingSkill).toBe(70)
    expect(k.gripQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).knurlers.push(makeKnurler(1))
    ;(sys as any).knurlers.push(makeKnurler(2))
    expect((sys as any).knurlers).toHaveLength(2)
  })
})
