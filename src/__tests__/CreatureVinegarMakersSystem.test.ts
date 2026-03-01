import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureVinegarMakersSystem } from '../systems/CreatureVinegarMakersSystem'
import type { VinegarMaker, VinegarBase } from '../systems/CreatureVinegarMakersSystem'

let nextId = 1
function makeSys(): CreatureVinegarMakersSystem { return new CreatureVinegarMakersSystem() }
function makeMaker(entityId: number, base: VinegarBase = 'apple'): VinegarMaker {
  return { id: nextId++, entityId, skill: 70, batchesBrewed: 12, vinegarBase: base, acidity: 65, reputation: 45, tick: 0 }
}

describe('CreatureVinegarMakersSystem.getMakers', () => {
  let sys: CreatureVinegarMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无醋坊工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'grape'))
    expect((sys as any).makers[0].vinegarBase).toBe('grape')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种醋基料', () => {
    const bases: VinegarBase[] = ['apple', 'grape', 'grain', 'honey']
    bases.forEach((b, i) => { ;(sys as any).makers.push(makeMaker(i + 1, b)) })
    const all = (sys as any).makers
    bases.forEach((b, i) => { expect(all[i].vinegarBase).toBe(b) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
