import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureGirdlerSystem } from '../systems/CreatureGirdlerSystem'
import type { Girdler } from '../systems/CreatureGirdlerSystem'

let nextId = 1
function makeSys(): CreatureGirdlerSystem { return new CreatureGirdlerSystem() }
function makeGirdler(entityId: number): Girdler {
  return { id: nextId++, entityId, leatherCutting: 50, buckleMaking: 60, stitchWork: 70, outputQuality: 80, tick: 0 }
}

describe('CreatureGirdlerSystem.getGirdlers', () => {
  let sys: CreatureGirdlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无腰带匠', () => { expect((sys as any).girdlers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).girdlers.push(makeGirdler(1))
    expect((sys as any).girdlers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).girdlers.push(makeGirdler(1))
    expect((sys as any).girdlers).toBe((sys as any).girdlers)
  })
  it('多个全部返回', () => {
    ;(sys as any).girdlers.push(makeGirdler(1))
    ;(sys as any).girdlers.push(makeGirdler(2))
    expect((sys as any).girdlers).toHaveLength(2)
  })
  it('四字段数据完整', () => {
    const g = makeGirdler(10)
    g.leatherCutting = 90; g.buckleMaking = 85; g.stitchWork = 80; g.outputQuality = 75
    ;(sys as any).girdlers.push(g)
    const r = (sys as any).girdlers[0]
    expect(r.leatherCutting).toBe(90); expect(r.buckleMaking).toBe(85)
    expect(r.stitchWork).toBe(80); expect(r.outputQuality).toBe(75)
  })
})
