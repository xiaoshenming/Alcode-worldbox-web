import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureClaspMakersSystem } from '../systems/CreatureClaspMakersSystem'
import type { ClaspMaker, ClaspType } from '../systems/CreatureClaspMakersSystem'

let nextId = 1
function makeSys(): CreatureClaspMakersSystem { return new CreatureClaspMakersSystem() }
function makeMaker(entityId: number, claspType: ClaspType = 'cloak'): ClaspMaker {
  return { id: nextId++, entityId, skill: 30, claspsMade: 10, claspType, precision: 60, reputation: 50, tick: 0 }
}

describe('CreatureClaspMakersSystem.getMakers', () => {
  let sys: CreatureClaspMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无扣环制作者', () => { expect(sys.getMakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'jewelry'))
    expect(sys.getMakers()[0].claspType).toBe('jewelry')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('支持所有 4 种扣环类型', () => {
    const types: ClaspType[] = ['cloak', 'jewelry', 'book', 'chest']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = sys.getMakers()
    types.forEach((t, i) => { expect(all[i].claspType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
