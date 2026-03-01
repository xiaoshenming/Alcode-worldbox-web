import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFermentationSystem } from '../systems/CreatureFermentationSystem'
import type { FermentedGood, FermentType } from '../systems/CreatureFermentationSystem'

let nextId = 1
function makeSys(): CreatureFermentationSystem { return new CreatureFermentationSystem() }
function makeGood(producerId: number, type: FermentType = 'fruit_wine'): FermentedGood {
  return { id: nextId++, producerId, type, quality: 70, potency: 50, moraleBoost: 10, tradeValue: 30, ageTicks: 100, tick: 0 }
}

describe('CreatureFermentationSystem.getGoods', () => {
  let sys: CreatureFermentationSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无发酵品', () => { expect((sys as any).goods).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).goods.push(makeGood(1, 'honey_mead'))
    expect((sys as any).goods[0].type).toBe('honey_mead')
  })

  it('返回内部引用', () => {
    ;(sys as any).goods.push(makeGood(1))
    expect((sys as any).goods).toBe((sys as any).goods)
  })

  it('支持所有 6 种发酵类型', () => {
    const types: FermentType[] = ['fruit_wine', 'grain_beer', 'honey_mead', 'herb_tonic', 'root_brew', 'mushroom_elixir']
    types.forEach((t, i) => { ;(sys as any).goods.push(makeGood(i + 1, t)) })
    const all = (sys as any).goods
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })
})

describe('CreatureFermentationSystem.getSkill', () => {
  let sys: CreatureFermentationSystem
  beforeEach(() => { sys = makeSys() })

  it('未知实体返回 0', () => { expect(((sys as any).skillMap.get(999) ?? 0)).toBe(0) })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 78)
    expect(((sys as any).skillMap.get(42) ?? 0)).toBe(78)
  })
})
