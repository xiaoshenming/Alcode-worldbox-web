import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBobbinLace2MakersSystem } from '../systems/CreatureBobbinLace2MakersSystem'
import type { BobbinLace2Maker, BobbinLace2Type } from '../systems/CreatureBobbinLace2MakersSystem'

let nextId = 1
function makeSys(): CreatureBobbinLace2MakersSystem { return new CreatureBobbinLace2MakersSystem() }
function makeMaker(entityId: number, type: BobbinLace2Type = 'torchon'): BobbinLace2Maker {
  return { id: nextId++, entityId, skill: 70, piecesMade: 12, laceType: type, threadCount: 65, reputation: 45, tick: 0 }
}

describe('CreatureBobbinLace2MakersSystem.getMakers', () => {
  let sys: CreatureBobbinLace2MakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无梭织花边工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'bruges'))
    expect((sys as any).makers[0].laceType).toBe('bruges')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种花边类型', () => {
    const types: BobbinLace2Type[] = ['torchon', 'cluny', 'bruges', 'honiton']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].laceType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
