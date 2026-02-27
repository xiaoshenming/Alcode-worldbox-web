import { describe, it, expect, beforeEach } from 'vitest'
import { CreaturePerfumerSystem } from '../systems/CreaturePerfumerSystem'
import type { Perfumer, FragranceType } from '../systems/CreaturePerfumerSystem'

let nextId = 1
function makeSys(): CreaturePerfumerSystem { return new CreaturePerfumerSystem() }
function makePerfumer(entityId: number, type: FragranceType = 'floral'): Perfumer {
  return { id: nextId++, entityId, skill: 70, essencesCollected: 20, perfumesCrafted: 5, fragranceType: type, reputation: 50, tick: 0 }
}

describe('CreaturePerfumerSystem.getPerfumers', () => {
  let sys: CreaturePerfumerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无香水制作者', () => { expect(sys.getPerfumers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).perfumers.push(makePerfumer(1, 'woody'))
    expect(sys.getPerfumers()[0].fragranceType).toBe('woody')
  })
  it('返回内部引用', () => {
    ;(sys as any).perfumers.push(makePerfumer(1))
    expect(sys.getPerfumers()).toBe((sys as any).perfumers)
  })
  it('支持所有4种香型', () => {
    const types: FragranceType[] = ['floral', 'spicy', 'woody', 'citrus']
    types.forEach((t, i) => { ;(sys as any).perfumers.push(makePerfumer(i + 1, t)) })
    const all = sys.getPerfumers()
    types.forEach((t, i) => { expect(all[i].fragranceType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).perfumers.push(makePerfumer(1))
    ;(sys as any).perfumers.push(makePerfumer(2))
    expect(sys.getPerfumers()).toHaveLength(2)
  })
})
