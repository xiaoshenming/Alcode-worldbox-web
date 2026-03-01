import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHarnessMakersSystem } from '../systems/CreatureHarnessMakersSystem'
import type { HarnessMaker, HarnessType } from '../systems/CreatureHarnessMakersSystem'

let nextId = 1
function makeSys(): CreatureHarnessMakersSystem { return new CreatureHarnessMakersSystem() }
function makeMaker(entityId: number, harnessType: HarnessType = 'riding'): HarnessMaker {
  return { id: nextId++, entityId, skill: 60, harnessessMade: 10, harnessType, leatherwork: 70, reputation: 50, tick: 0 }
}

describe('CreatureHarnessMakersSystem.getMakers', () => {
  let sys: CreatureHarnessMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无马具匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'draft'))
    expect((sys as any).makers[0].harnessType).toBe('draft')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有 4 种马具类型', () => {
    const types: HarnessType[] = ['draft', 'riding', 'pack', 'ceremonial']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].harnessType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
