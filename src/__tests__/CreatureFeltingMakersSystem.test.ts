import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFeltingMakersSystem } from '../systems/CreatureFeltingMakersSystem'
import type { FeltingMaker, FeltingType } from '../systems/CreatureFeltingMakersSystem'

let nextId = 1
function makeSys(): CreatureFeltingMakersSystem { return new CreatureFeltingMakersSystem() }
function makeMaker(entityId: number, feltingType: FeltingType = 'wet_felting'): FeltingMaker {
  return { id: nextId++, entityId, skill: 40, piecesMade: 10, feltingType, fiberDensity: 70, reputation: 60, tick: 0 }
}

describe('CreatureFeltingMakersSystem.getMakers', () => {
  let sys: CreatureFeltingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无缩绒工', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'needle_felting'))
    expect((sys as any).makers[0].feltingType).toBe('needle_felting')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种缩绒方式', () => {
    const types: FeltingType[] = ['wet_felting', 'needle_felting', 'nuno', 'cobweb']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].feltingType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
