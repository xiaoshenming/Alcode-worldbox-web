import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureWeaverSystem } from '../systems/CreatureWeaverSystem'
import type { Weaver, FiberType } from '../systems/CreatureWeaverSystem'

let nextId = 1
function makeSys(): CreatureWeaverSystem { return new CreatureWeaverSystem() }
function makeWeaver(entityId: number, fiber: FiberType = 'cotton'): Weaver {
  return { id: nextId++, entityId, skill: 70, fibersCollected: 50, clothProduced: 12, loomLevel: 2, specialization: fiber, tick: 0 }
}

describe('CreatureWeaverSystem.getWeavers', () => {
  let sys: CreatureWeaverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无织布工', () => { expect((sys as any).weavers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).weavers.push(makeWeaver(1, 'silk'))
    expect((sys as any).weavers[0].specialization).toBe('silk')
  })
  it('返回只读引用', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    expect((sys as any).weavers).toBe((sys as any).weavers)
  })
  it('支持所有4种纤维类型', () => {
    const fibers: FiberType[] = ['cotton', 'silk', 'wool', 'linen']
    fibers.forEach((f, i) => { ;(sys as any).weavers.push(makeWeaver(i + 1, f)) })
    const all = (sys as any).weavers
    fibers.forEach((f, i) => { expect(all[i].specialization).toBe(f) })
  })
  it('字段正确', () => {
    ;(sys as any).weavers.push(makeWeaver(2, 'wool'))
    const w = (sys as any).weavers[0]
    expect(w.fibersCollected).toBe(50)
    expect(w.loomLevel).toBe(2)
  })
})
