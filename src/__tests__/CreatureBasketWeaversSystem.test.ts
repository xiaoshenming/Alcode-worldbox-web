import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBasketWeaversSystem } from '../systems/CreatureBasketWeaversSystem'
import type { BasketWeaver, BasketType } from '../systems/CreatureBasketWeaversSystem'

let nextId = 1
function makeSys(): CreatureBasketWeaversSystem { return new CreatureBasketWeaversSystem() }
function makeMaker(entityId: number, type: BasketType = 'storage'): BasketWeaver {
  return { id: nextId++, entityId, skill: 70, basketsMade: 12, basketType: type, tightness: 65, reputation: 45, tick: 0 }
}

describe('CreatureBasketWeaversSystem.getWeavers', () => {
  let sys: CreatureBasketWeaversSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无编篮工', () => { expect(sys.getWeavers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).weavers.push(makeMaker(1, 'fishing'))
    expect(sys.getWeavers()[0].basketType).toBe('fishing')
  })
  it('返回内部引用', () => {
    ;(sys as any).weavers.push(makeMaker(1))
    expect(sys.getWeavers()).toBe((sys as any).weavers)
  })
  it('支持所有4种篮子类型', () => {
    const types: BasketType[] = ['storage', 'carrying', 'fishing', 'decorative']
    types.forEach((t, i) => { ;(sys as any).weavers.push(makeMaker(i + 1, t)) })
    const all = sys.getWeavers()
    types.forEach((t, i) => { expect(all[i].basketType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).weavers.push(makeMaker(1))
    ;(sys as any).weavers.push(makeMaker(2))
    expect(sys.getWeavers()).toHaveLength(2)
  })
})
