import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTinsmithsSystem } from '../systems/CreatureTinsmithsSystem'
import type { Tinsmith, TinProduct } from '../systems/CreatureTinsmithsSystem'

let nextId = 1
function makeSys(): CreatureTinsmithsSystem { return new CreatureTinsmithsSystem() }
function makeTinsmith(entityId: number, product: TinProduct = 'plate'): Tinsmith {
  return { id: nextId++, entityId, skill: 70, itemsMade: 12, product, finishQuality: 65, reputation: 45, tick: 0 }
}

describe('CreatureTinsmithsSystem.getTinsmiths', () => {
  let sys: CreatureTinsmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锡匠', () => { expect(sys.getTinsmiths()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).tinsmiths.push(makeTinsmith(1, 'lantern'))
    expect(sys.getTinsmiths()[0].product).toBe('lantern')
  })
  it('返回内部引用', () => {
    ;(sys as any).tinsmiths.push(makeTinsmith(1))
    expect(sys.getTinsmiths()).toBe((sys as any).tinsmiths)
  })
  it('支持所有4种锡制品类型', () => {
    const products: TinProduct[] = ['plate', 'cup', 'lantern', 'canister']
    products.forEach((p, i) => { ;(sys as any).tinsmiths.push(makeTinsmith(i + 1, p)) })
    const all = sys.getTinsmiths()
    products.forEach((p, i) => { expect(all[i].product).toBe(p) })
  })
  it('多个全部返回', () => {
    ;(sys as any).tinsmiths.push(makeTinsmith(1))
    ;(sys as any).tinsmiths.push(makeTinsmith(2))
    expect(sys.getTinsmiths()).toHaveLength(2)
  })
})
