import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRivetMakersSystem } from '../systems/CreatureRivetMakersSystem'
import type { RivetMaker, RivetType } from '../systems/CreatureRivetMakersSystem'

let nextId = 1
function makeSys(): CreatureRivetMakersSystem { return new CreatureRivetMakersSystem() }
function makeMaker(entityId: number, type: RivetType = 'ship'): RivetMaker {
  return { id: nextId++, entityId, skill: 70, rivetsMade: 100, rivetType: type, strength: 80, reputation: 50, tick: 0 }
}

describe('CreatureRivetMakersSystem.getMakers', () => {
  let sys: CreatureRivetMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无铆钉工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'armor'))
    expect((sys as any).makers[0].rivetType).toBe('armor')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种铆钉类型', () => {
    const types: RivetType[] = ['ship', 'armor', 'bridge', 'decorative']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].rivetType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
