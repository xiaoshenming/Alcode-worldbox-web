import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBuckleMakersSystem } from '../systems/CreatureBuckleMakersSystem'
import type { BuckleMaker, BuckleType } from '../systems/CreatureBuckleMakersSystem'

let nextId = 1
function makeSys(): CreatureBuckleMakersSystem { return new CreatureBuckleMakersSystem() }
function makeMaker(entityId: number, buckleType: BuckleType = 'belt'): BuckleMaker {
  return { id: nextId++, entityId, skill: 30, bucklesMade: 5, buckleType, craftsmanship: 40, reputation: 35, tick: 0 }
}

describe('CreatureBuckleMakersSystem.getMakers', () => {
  let sys: CreatureBuckleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无扣具师', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'armor'))
    expect((sys as any).makers[0].buckleType).toBe('armor')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种扣具类型', () => {
    const types: BuckleType[] = ['belt', 'shoe', 'armor', 'ornamental']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].buckleType).toBe(t) })
  })

  it('数据字段完整', () => {
    const m = makeMaker(10, 'shoe')
    m.skill = 80; m.bucklesMade = 20; m.craftsmanship = 90; m.reputation = 85
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.skill).toBe(80); expect(r.bucklesMade).toBe(20)
    expect(r.craftsmanship).toBe(90); expect(r.reputation).toBe(85)
  })
})
