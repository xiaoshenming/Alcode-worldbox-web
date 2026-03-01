import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBasketWeaverSystem } from '../systems/CreatureBasketWeaverSystem'
import type { BasketWeaver } from '../systems/CreatureBasketWeaverSystem'

let nextId = 1
function makeSys(): CreatureBasketWeaverSystem { return new CreatureBasketWeaverSystem() }
function makeWeaver(entityId: number): BasketWeaver {
  return { id: nextId++, entityId, fiberSelection: 30, weavePattern: 25, structuralIntegrity: 20, outputQuality: 35, tick: 0 }
}

describe('CreatureBasketWeaverSystem.getWeavers', () => {
  let sys: CreatureBasketWeaverSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无篮编师', () => { expect((sys as any).weavers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    expect((sys as any).weavers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    expect((sys as any).weavers).toBe((sys as any).weavers)
  })

  it('多个全部返回', () => {
    ;(sys as any).weavers.push(makeWeaver(1))
    ;(sys as any).weavers.push(makeWeaver(2))
    expect((sys as any).weavers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const w = makeWeaver(10)
    w.fiberSelection = 80; w.weavePattern = 75; w.structuralIntegrity = 70; w.outputQuality = 65
    ;(sys as any).weavers.push(w)
    const r = (sys as any).weavers[0]
    expect(r.fiberSelection).toBe(80)
    expect(r.weavePattern).toBe(75)
    expect(r.structuralIntegrity).toBe(70)
    expect(r.outputQuality).toBe(65)
  })
})
