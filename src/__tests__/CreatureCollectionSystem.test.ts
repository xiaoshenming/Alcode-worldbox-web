import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCollectionSystem } from '../systems/CreatureCollectionSystem'
import type { Collection, CollectibleType } from '../systems/CreatureCollectionSystem'

function makeSys(): CreatureCollectionSystem { return new CreatureCollectionSystem() }
function makeCollection(creatureId: number, totalValue = 50): Collection {
  const items = new Map<CollectibleType, number>()
  items.set('gem', 2)
  return { creatureId, items, totalValue, pride: 60, lastFoundTick: 0 }
}

describe('CreatureCollectionSystem.getCollection', () => {
  let sys: CreatureCollectionSystem
  beforeEach(() => { sys = makeSys() })

  it('不存在时返回 undefined', () => {
    expect(sys.getCollection(999)).toBeUndefined()
  })

  it('注入后返回正确收藏', () => {
    ;(sys as any).collections.set(1, makeCollection(1, 100))
    const c = sys.getCollection(1)
    expect(c).toBeDefined()
    expect(c!.totalValue).toBe(100)
  })
})

describe('CreatureCollectionSystem.getCollectionCount', () => {
  let sys: CreatureCollectionSystem
  beforeEach(() => { sys = makeSys() })

  it('初始数量为 0', () => { expect(sys.getCollectionCount()).toBe(0) })

  it('注入后正确计数', () => {
    ;(sys as any).collections.set(1, makeCollection(1))
    ;(sys as any).collections.set(2, makeCollection(2))
    expect(sys.getCollectionCount()).toBe(2)
  })
})

describe('CreatureCollectionSystem.getTopCollectors', () => {
  let sys: CreatureCollectionSystem
  beforeEach(() => { sys = makeSys() })

  it('空时返回空数组', () => {
    expect(sys.getTopCollectors(3)).toHaveLength(0)
  })

  it('按总价值降序排列', () => {
    ;(sys as any).collections.set(1, makeCollection(1, 30))
    ;(sys as any).collections.set(2, makeCollection(2, 80))
    ;(sys as any).collections.set(3, makeCollection(3, 50))
    const top = sys.getTopCollectors(2)
    expect(top).toHaveLength(2)
    expect(top[0].totalValue).toBe(80)
    expect(top[1].totalValue).toBe(50)
  })

  it('n 大于收藏者数量时返回全部', () => {
    ;(sys as any).collections.set(1, makeCollection(1, 100))
    expect(sys.getTopCollectors(10)).toHaveLength(1)
  })
})
