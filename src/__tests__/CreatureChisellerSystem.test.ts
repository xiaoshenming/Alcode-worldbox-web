import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureChisellerSystem } from '../systems/CreatureChisellerSystem'
import type { Chiseller } from '../systems/CreatureChisellerSystem'

let nextId = 1
function makeSys(): CreatureChisellerSystem { return new CreatureChisellerSystem() }
function makeChiseller(entityId: number): Chiseller {
  return { id: nextId++, entityId, chisellingSkill: 30, cuttingPrecision: 25, metalCarving: 20, edgeDefinition: 35, tick: 0 }
}

describe('CreatureChisellerSystem.getChisellers', () => {
  let sys: CreatureChisellerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无凿刻工', () => { expect(sys.getChisellers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).chisellers.push(makeChiseller(1))
    expect(sys.getChisellers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).chisellers.push(makeChiseller(1))
    expect(sys.getChisellers()).toBe((sys as any).chisellers)
  })

  it('多个全部返回', () => {
    ;(sys as any).chisellers.push(makeChiseller(1))
    ;(sys as any).chisellers.push(makeChiseller(2))
    expect(sys.getChisellers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const c = makeChiseller(10)
    c.chisellingSkill = 80; c.cuttingPrecision = 75; c.metalCarving = 70; c.edgeDefinition = 65
    ;(sys as any).chisellers.push(c)
    const r = sys.getChisellers()[0]
    expect(r.chisellingSkill).toBe(80); expect(r.cuttingPrecision).toBe(75)
    expect(r.metalCarving).toBe(70); expect(r.edgeDefinition).toBe(65)
  })
})
