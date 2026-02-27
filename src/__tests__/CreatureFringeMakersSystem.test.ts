import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFringeMakersSystem } from '../systems/CreatureFringeMakersSystem'
import type { FringeMaker, FringeType } from '../systems/CreatureFringeMakersSystem'

let nextId = 1
function makeSys(): CreatureFringeMakersSystem { return new CreatureFringeMakersSystem() }
function makeMaker(entityId: number, fringeType: FringeType = 'bullion'): FringeMaker {
  return { id: nextId++, entityId, skill: 40, fringesMade: 10, fringeType, evenness: 70, reputation: 60, tick: 0 }
}

describe('CreatureFringeMakersSystem.getMakers', () => {
  let sys: CreatureFringeMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无流苏工', () => { expect(sys.getMakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'tassel'))
    expect(sys.getMakers()[0].fringeType).toBe('tassel')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('支持所有 4 种流苏类型', () => {
    const types: FringeType[] = ['bullion', 'tassel', 'knotted', 'looped']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = sys.getMakers()
    types.forEach((t, i) => { expect(all[i].fringeType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
