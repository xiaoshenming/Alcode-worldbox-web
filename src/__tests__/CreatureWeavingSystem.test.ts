import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureWeavingSystem } from '../systems/CreatureWeavingSystem'
import type { WovenGood, FabricType, PatternStyle } from '../systems/CreatureWeavingSystem'

let nextId = 1
function makeSys(): CreatureWeavingSystem { return new CreatureWeavingSystem() }
function makeGood(weaverId: number, fabric: FabricType = 'linen'): WovenGood {
  return { id: nextId++, weaverId, fabric, pattern: 'plain', quality: 70, warmth: 60, tradeValue: 50, tick: 0 }
}

describe('CreatureWeavingSystem.getGoods', () => {
  let sys: CreatureWeavingSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无纺织品', () => { expect(sys.getGoods()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).goods.push(makeGood(1, 'silk'))
    expect(sys.getGoods()[0].fabric).toBe('silk')
  })
  it('返回只读引用', () => {
    ;(sys as any).goods.push(makeGood(1))
    expect(sys.getGoods()).toBe((sys as any).goods)
  })
  it('getSkill无记录返回0', () => {
    expect(sys.getSkill(999)).toBe(0)
  })
  it('getSkill可通过skillMap注入', () => {
    ;(sys as any).skillMap.set(1, 80)
    expect(sys.getSkill(1)).toBe(80)
  })
  it('支持所有6种织物类型', () => {
    const fabrics: FabricType[] = ['linen', 'wool', 'silk', 'cotton', 'hemp', 'tapestry']
    fabrics.forEach((f, i) => { ;(sys as any).goods.push(makeGood(i + 1, f)) })
    expect(sys.getGoods()).toHaveLength(6)
  })
})
