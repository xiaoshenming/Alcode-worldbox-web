import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureWarpingMakersSystem } from '../systems/CreatureWarpingMakersSystem'
import type { WarpingMaker } from '../systems/CreatureWarpingMakersSystem'

let nextId = 1
function makeSys(): CreatureWarpingMakersSystem { return new CreatureWarpingMakersSystem() }
function makeMaker(entityId: number): WarpingMaker {
  return { id: nextId++, entityId, tensionControl: 70, threadAlignment: 65, beamLoading: 80, efficiency: 75, tick: 0 }
}

describe('CreatureWarpingMakersSystem.getMakers', () => {
  let sys: CreatureWarpingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无整经工匠', () => { expect((sys as any).makers).toHaveLength(0) })
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
    expect(m.tensionControl).toBe(70)
    expect(m.beamLoading).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
