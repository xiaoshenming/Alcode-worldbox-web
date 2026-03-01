import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHornersSystem } from '../systems/CreatureHornersSystem'
import type { Horner, HornProduct } from '../systems/CreatureHornersSystem'

let nextId = 1
function makeSys(): CreatureHornersSystem { return new CreatureHornersSystem() }
function makeHorner(entityId: number, product: HornProduct = 'comb'): Horner {
  return { id: nextId++, entityId, skill: 60, itemsCrafted: 10, product, quality: 70, reputation: 50, tick: 0 }
}

describe('CreatureHornersSystem.getHorners', () => {
  let sys: CreatureHornersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无角制品工', () => { expect((sys as any).horners).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).horners.push(makeHorner(1, 'button'))
    expect((sys as any).horners[0].product).toBe('button')
  })
  it('返回内部引用', () => {
    ;(sys as any).horners.push(makeHorner(1))
    expect((sys as any).horners).toBe((sys as any).horners)
  })
  it('支持所有 4 种产品', () => {
    const products: HornProduct[] = ['comb', 'button', 'cup', 'ornament']
    products.forEach((p, i) => { ;(sys as any).horners.push(makeHorner(i + 1, p)) })
    const all = (sys as any).horners
    products.forEach((p, i) => { expect(all[i].product).toBe(p) })
  })
  it('多个全部返回', () => {
    ;(sys as any).horners.push(makeHorner(1))
    ;(sys as any).horners.push(makeHorner(2))
    expect((sys as any).horners).toHaveLength(2)
  })
})
