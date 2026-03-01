import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFeltersSystem } from '../systems/CreatureFeltersSystem'
import type { Felter, FeltProduct } from '../systems/CreatureFeltersSystem'

let nextId = 1
function makeSys(): CreatureFeltersSystem { return new CreatureFeltersSystem() }
function makeFelter(entityId: number, product: FeltProduct = 'hat'): Felter {
  return { id: nextId++, entityId, skill: 40, feltProduced: 10, product, thickness: 5, reputation: 60, tick: 0 }
}

describe('CreatureFeltersSystem.getFelters', () => {
  let sys: CreatureFeltersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无毡工', () => { expect((sys as any).felters).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).felters.push(makeFelter(1, 'blanket'))
    expect((sys as any).felters[0].product).toBe('blanket')
  })

  it('返回内部引用', () => {
    ;(sys as any).felters.push(makeFelter(1))
    expect((sys as any).felters).toBe((sys as any).felters)
  })

  it('支持所有 4 种毡制品', () => {
    const products: FeltProduct[] = ['hat', 'blanket', 'tent', 'boot']
    products.forEach((p, i) => { ;(sys as any).felters.push(makeFelter(i + 1, p)) })
    const all = (sys as any).felters
    products.forEach((p, i) => { expect(all[i].product).toBe(p) })
  })

  it('多个全部返回', () => {
    ;(sys as any).felters.push(makeFelter(1))
    ;(sys as any).felters.push(makeFelter(2))
    expect((sys as any).felters).toHaveLength(2)
  })
})
