import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureLoomMakersSystem } from '../systems/CreatureLoomMakersSystem'
import type { LoomMaker } from '../systems/CreatureLoomMakersSystem'

let nextId = 1
function makeSys(): CreatureLoomMakersSystem { return new CreatureLoomMakersSystem() }
function makeMaker(entityId: number): LoomMaker {
  return { id: nextId++, entityId, loomMastery: 70, threadCount: 200, patternMemory: 80, weavingSpeed: 60, tick: 0 }
}

describe('CreatureLoomMakersSystem.getMakers', () => {
  let sys: CreatureLoomMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无织机师', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(5))
    const m = (sys as any).makers[0]
    expect(m.loomMastery).toBe(70)
    expect(m.patternMemory).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
