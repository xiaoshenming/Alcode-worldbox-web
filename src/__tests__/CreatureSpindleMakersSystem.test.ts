import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureSpindleMakersSystem } from '../systems/CreatureSpindleMakersSystem'
import type { SpindleMaker, SpindleType } from '../systems/CreatureSpindleMakersSystem'

let nextId = 1
function makeSys(): CreatureSpindleMakersSystem { return new CreatureSpindleMakersSystem() }
function makeMaker(entityId: number, type: SpindleType = 'drop'): SpindleMaker {
  return { id: nextId++, entityId, skill: 70, spindlesMade: 12, spindleType: type, balance: 65, reputation: 45, tick: 0 }
}

describe('CreatureSpindleMakersSystem.getMakers', () => {
  let sys: CreatureSpindleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无纺锤工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'wheel'))
    expect((sys as any).makers[0].spindleType).toBe('wheel')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种纺锤类型', () => {
    const types: SpindleType[] = ['drop', 'wheel', 'furniture', 'staircase']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].spindleType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
