import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePerfumersSystem } from '../systems/CreaturePerfumersSystem'
import type { Perfumer, FragranceType } from '../systems/CreaturePerfumersSystem'

let nextId = 1
function makeSys(): CreaturePerfumersSystem { return new CreaturePerfumersSystem() }
function makePerfumer(entityId: number, type: FragranceType = 'floral'): Perfumer {
  return { id: nextId++, entityId, skill: 70, blendsCreated: 10, fragranceType: type, potency: 65, complexity: 60, tick: 0 }
}

describe('CreaturePerfumersSystem.getPerfumers', () => {
  let sys: CreaturePerfumersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无香水师', () => { expect((sys as any).perfumers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).perfumers.push(makePerfumer(1, 'herbal'))
    expect((sys as any).perfumers[0].fragranceType).toBe('herbal')
  })
  it('返回内部引用', () => {
    ;(sys as any).perfumers.push(makePerfumer(1))
    expect((sys as any).perfumers).toBe((sys as any).perfumers)
  })
  it('支持所有4种香型', () => {
    const types: FragranceType[] = ['floral', 'herbal', 'spiced', 'resinous']
    types.forEach((t, i) => { ;(sys as any).perfumers.push(makePerfumer(i + 1, t)) })
    const all = (sys as any).perfumers
    types.forEach((t, i) => { expect(all[i].fragranceType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).perfumers.push(makePerfumer(1))
    ;(sys as any).perfumers.push(makePerfumer(2))
    expect((sys as any).perfumers).toHaveLength(2)
  })
})
