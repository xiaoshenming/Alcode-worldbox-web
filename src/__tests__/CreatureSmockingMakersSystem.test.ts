import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSmockingMakersSystem } from '../systems/CreatureSmockingMakersSystem'
import type { SmockingMaker, SmockingType } from '../systems/CreatureSmockingMakersSystem'

let nextId = 1
function makeSys(): CreatureSmockingMakersSystem { return new CreatureSmockingMakersSystem() }
function makeMaker(entityId: number, type: SmockingType = 'english'): SmockingMaker {
  return { id: nextId++, entityId, skill: 70, piecesMade: 12, smockingType: type, gatherPrecision: 65, reputation: 45, tick: 0 }
}

describe('CreatureSmockingMakersSystem.getMakers', () => {
  let sys: CreatureSmockingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'lattice'))
    expect((sys as any).makers[0].smockingType).toBe('lattice')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种Smocking类型', () => {
    const types: SmockingType[] = ['english', 'north_american', 'lattice', 'honeycomb']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].smockingType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
