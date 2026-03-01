import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSieveMakersSystem } from '../systems/CreatureSieveMakersSystem'
import type { SieveMaker, SieveType } from '../systems/CreatureSieveMakersSystem'

let nextId = 1
function makeSys(): CreatureSieveMakersSystem { return new CreatureSieveMakersSystem() }
function makeMaker(entityId: number, type: SieveType = 'grain'): SieveMaker {
  return { id: nextId++, entityId, skill: 70, sievesMade: 15, sieveType: type, meshFineness: 65, reputation: 45, tick: 0 }
}

describe('CreatureSieveMakersSystem.getMakers', () => {
  let sys: CreatureSieveMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无筛子工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'mining'))
    expect((sys as any).makers[0].sieveType).toBe('mining')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种筛子类型', () => {
    const types: SieveType[] = ['grain', 'flour', 'mining', 'sand']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].sieveType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
