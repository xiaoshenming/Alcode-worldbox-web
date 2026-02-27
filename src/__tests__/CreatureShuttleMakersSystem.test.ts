import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureShuttleMakersSystem } from '../systems/CreatureShuttleMakersSystem'
import type { ShuttleMaker, ShuttleType } from '../systems/CreatureShuttleMakersSystem'

let nextId = 1
function makeSys(): CreatureShuttleMakersSystem { return new CreatureShuttleMakersSystem() }
function makeMaker(entityId: number, type: ShuttleType = 'fly'): ShuttleMaker {
  return { id: nextId++, entityId, skill: 70, shuttlesMade: 20, shuttleType: type, aerodynamics: 75, reputation: 50, tick: 0 }
}

describe('CreatureShuttleMakersSystem.getMakers', () => {
  let sys: CreatureShuttleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无梭子工', () => { expect(sys.getMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'boat'))
    expect(sys.getMakers()[0].shuttleType).toBe('boat')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })
  it('支持所有4种梭子类型', () => {
    const types: ShuttleType[] = ['fly', 'boat', 'stick', 'rag']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = sys.getMakers()
    types.forEach((t, i) => { expect(all[i].shuttleType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
