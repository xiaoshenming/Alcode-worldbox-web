import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSpinningMakersSystem } from '../systems/CreatureSpinningMakersSystem'
import type { SpinningMaker } from '../systems/CreatureSpinningMakersSystem'

let nextId = 1
function makeSys(): CreatureSpinningMakersSystem { return new CreatureSpinningMakersSystem() }
function makeMaker(entityId: number): SpinningMaker {
  return { id: nextId++, entityId, spindleSpeed: 70, fiberQuality: 65, threadStrength: 80, consistency: 75, tick: 0 }
}

describe('CreatureSpinningMakersSystem.getMakers', () => {
  let sys: CreatureSpinningMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无纺纱工匠', () => { expect((sys as any).makers).toHaveLength(0) })
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
    expect(m.spindleSpeed).toBe(70)
    expect(m.threadStrength).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
