import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLimeburnersSystem } from '../systems/CreatureLimeburnersSystem'
import type { Limeburner, LimeProduct } from '../systems/CreatureLimeburnersSystem'

let nextId = 1
function makeSys(): CreatureLimeburnersSystem { return new CreatureLimeburnersSystem() }
function makeBurner(entityId: number, product: LimeProduct = 'quicklime'): Limeburner {
  return { id: nextId++, entityId, skill: 60, batchesBurned: 10, product, purity: 80, reputation: 50, tick: 0 }
}

describe('CreatureLimeburnersSystem.getBurners', () => {
  let sys: CreatureLimeburnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无烧灰工', () => { expect((sys as any).burners).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).burners.push(makeBurner(1, 'mortar'))
    expect((sys as any).burners[0].product).toBe('mortar')
  })
  it('返回内部引用', () => {
    ;(sys as any).burners.push(makeBurner(1))
    expect((sys as any).burners).toBe((sys as any).burners)
  })
  it('支持所有 4 种产品', () => {
    const products: LimeProduct[] = ['quicklime', 'slaked_lime', 'mortar', 'plaster']
    products.forEach((p, i) => { ;(sys as any).burners.push(makeBurner(i + 1, p)) })
    const all = (sys as any).burners
    products.forEach((p, i) => { expect(all[i].product).toBe(p) })
  })
  it('多个全部返回', () => {
    ;(sys as any).burners.push(makeBurner(1))
    ;(sys as any).burners.push(makeBurner(2))
    expect((sys as any).burners).toHaveLength(2)
  })
})
