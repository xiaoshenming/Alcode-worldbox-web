import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRopeMakersSystem } from '../systems/CreatureRopeMakersSystem'
import type { RopeMaker } from '../systems/CreatureRopeMakersSystem'

let nextId = 1
function makeSys(): CreatureRopeMakersSystem { return new CreatureRopeMakersSystem() }
function makeMaker(entityId: number): RopeMaker {
  return { id: nextId++, entityId, twistStrength: 70, fiberSelection: 65, ropeLength: 80, durability: 75, tick: 0 }
}

describe('CreatureRopeMakersSystem.getMakers', () => {
  let sys: CreatureRopeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无绳索工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(2))
    const m = (sys as any).makers[0]
    expect(m.twistStrength).toBe(70)
    expect(m.durability).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
