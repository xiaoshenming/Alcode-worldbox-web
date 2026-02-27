import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCalderersSystem } from '../systems/CreatureCalderersSystem'
import type { Calderer, CauldronMetal } from '../systems/CreatureCalderersSystem'

let nextId = 1
function makeSys(): CreatureCalderersSystem { return new CreatureCalderersSystem() }
function makeMaker(entityId: number, metalType: CauldronMetal = 'iron'): Calderer {
  return { id: nextId++, entityId, skill: 30, cauldronsMade: 10, metalType, heatRetention: 60, reputation: 50, tick: 0 }
}

describe('CreatureCalderersSystem.getMakers', () => {
  let sys: CreatureCalderersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无大锅制作者', () => { expect(sys.getMakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'bronze'))
    expect(sys.getMakers()[0].metalType).toBe('bronze')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('支持所有 4 种金属类型', () => {
    const metals: CauldronMetal[] = ['iron', 'copper', 'bronze', 'brass']
    metals.forEach((m, i) => { ;(sys as any).makers.push(makeMaker(i + 1, m)) })
    const all = sys.getMakers()
    metals.forEach((m, i) => { expect(all[i].metalType).toBe(m) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
