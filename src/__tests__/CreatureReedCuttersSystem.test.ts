import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureReedCuttersSystem } from '../systems/CreatureReedCuttersSystem'
import type { ReedCutter, ReedProduct } from '../systems/CreatureReedCuttersSystem'

let nextId = 1
function makeSys(): CreatureReedCuttersSystem { return new CreatureReedCuttersSystem() }
function makeCutter(entityId: number, product: ReedProduct = 'thatch'): ReedCutter {
  return { id: nextId++, entityId, skill: 70, bundlesHarvested: 40, product, efficiency: 65, reputation: 45, tick: 0 }
}

describe('CreatureReedCuttersSystem.getCutters', () => {
  let sys: CreatureReedCuttersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无芦苇割工', () => { expect((sys as any).cutters).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).cutters.push(makeCutter(1, 'basket'))
    expect((sys as any).cutters[0].product).toBe('basket')
  })
  it('返回内部引用', () => {
    ;(sys as any).cutters.push(makeCutter(1))
    expect((sys as any).cutters).toBe((sys as any).cutters)
  })
  it('支持所有4种产品', () => {
    const products: ReedProduct[] = ['thatch', 'basket', 'mat', 'rope']
    products.forEach((p, i) => { ;(sys as any).cutters.push(makeCutter(i + 1, p)) })
    const all = (sys as any).cutters
    products.forEach((p, i) => { expect(all[i].product).toBe(p) })
  })
  it('多个全部返回', () => {
    ;(sys as any).cutters.push(makeCutter(1))
    ;(sys as any).cutters.push(makeCutter(2))
    expect((sys as any).cutters).toHaveLength(2)
  })
})
