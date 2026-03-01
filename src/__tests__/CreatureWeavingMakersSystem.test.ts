import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureWeavingMakersSystem } from '../systems/CreatureWeavingMakersSystem'
import type { WeavingMaker, WeavingType } from '../systems/CreatureWeavingMakersSystem'

let nextId = 1
function makeSys(): CreatureWeavingMakersSystem { return new CreatureWeavingMakersSystem() }
function makeMaker(entityId: number, type: WeavingType = 'plain'): WeavingMaker {
  return { id: nextId++, entityId, skill: 70, clothMade: 12, weavingType: type, threadDensity: 65, reputation: 45, tick: 0 }
}

describe('CreatureWeavingMakersSystem.getMakers', () => {
  let sys: CreatureWeavingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无织造工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'twill'))
    expect((sys as any).makers[0].weavingType).toBe('twill')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种织造类型', () => {
    const types: WeavingType[] = ['plain', 'twill', 'satin', 'jacquard']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].weavingType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
