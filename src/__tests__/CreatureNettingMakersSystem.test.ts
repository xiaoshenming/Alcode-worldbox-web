import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNettingMakersSystem } from '../systems/CreatureNettingMakersSystem'
import type { NettingMaker, NettingType } from '../systems/CreatureNettingMakersSystem'

let nextId = 1
function makeSys(): CreatureNettingMakersSystem { return new CreatureNettingMakersSystem() }
function makeMaker(entityId: number, nettingType: NettingType = 'fishing'): NettingMaker {
  return { id: nextId++, entityId, skill: 60, netsMade: 10, nettingType, knotStrength: 70, reputation: 50, tick: 0 }
}

describe('CreatureNettingMakersSystem.getMakers', () => {
  let sys: CreatureNettingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无编网师', () => { expect(sys.getMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'cargo'))
    expect(sys.getMakers()[0].nettingType).toBe('cargo')
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })
  it('支持所有 4 种网类型', () => {
    const types: NettingType[] = ['fishing', 'hunting', 'cargo', 'decorative']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = sys.getMakers()
    types.forEach((t, i) => { expect(all[i].nettingType).toBe(t) })
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
