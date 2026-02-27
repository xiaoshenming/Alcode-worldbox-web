import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureMacrameMakersSystem } from '../systems/CreatureMacrameMakersSystem'
import type { MacrameMaker, MacrameType } from '../systems/CreatureMacrameMakersSystem'

let nextId = 1
function makeSys(): CreatureMacrameMakersSystem { return new CreatureMacrameMakersSystem() }
function makeMaker(entityId: number, macrameType: MacrameType = 'wall_hanging'): MacrameMaker {
  return { id: nextId++, entityId, skill: 60, piecesMade: 10, macrameType, knotDensity: 70, reputation: 50, tick: 0 }
}

describe('CreatureMacrameMakersSystem.getMakers', () => {
  let sys: CreatureMacrameMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无绳结师', () => { expect(sys.getMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'plant_hanger'))
    expect(sys.getMakers()[0].macrameType).toBe('plant_hanger')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })
  it('支持所有 4 种绳结类型', () => {
    const types: MacrameType[] = ['wall_hanging', 'plant_hanger', 'curtain', 'belt']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = sys.getMakers()
    types.forEach((t, i) => { expect(all[i].macrameType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
