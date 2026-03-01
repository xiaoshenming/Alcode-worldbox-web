import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureTasselMakersSystem } from '../systems/CreatureTasselMakersSystem'
import type { TasselMaker, TasselType } from '../systems/CreatureTasselMakersSystem'

let nextId = 1
function makeSys(): CreatureTasselMakersSystem { return new CreatureTasselMakersSystem() }
function makeMaker(entityId: number, type: TasselType = 'silk'): TasselMaker {
  return { id: nextId++, entityId, skill: 70, tasselsMade: 12, tasselType: type, symmetry: 65, reputation: 45, tick: 0 }
}

describe('CreatureTasselMakersSystem.getMakers', () => {
  let sys: CreatureTasselMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无流苏工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'metallic'))
    expect((sys as any).makers[0].tasselType).toBe('metallic')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('支持所有4种流苏类型', () => {
    const types: TasselType[] = ['silk', 'wool', 'metallic', 'ceremonial']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].tasselType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
