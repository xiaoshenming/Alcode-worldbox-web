import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBobbinMakersSystem } from '../systems/CreatureBobbinMakersSystem'
import type { BobbinMaker, BobbinType } from '../systems/CreatureBobbinMakersSystem'

let nextId = 1
function makeSys(): CreatureBobbinMakersSystem { return new CreatureBobbinMakersSystem() }
function makeMaker(entityId: number, bobbinType: BobbinType = 'spinning'): BobbinMaker {
  return { id: nextId++, entityId, skill: 30, bobbinsMade: 5, bobbinType, smoothness: 40, reputation: 35, tick: 0 }
}

describe('CreatureBobbinMakersSystem.getMakers', () => {
  let sys: CreatureBobbinMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无线轴师', () => { expect(sys.getMakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'lace'))
    expect(sys.getMakers()[0].bobbinType).toBe('lace')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('支持所有 4 种线轴类型', () => {
    const types: BobbinType[] = ['spinning', 'weaving', 'lace', 'sewing']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = sys.getMakers()
    types.forEach((t, i) => { expect(all[i].bobbinType).toBe(t) })
  })

  it('数据字段完整', () => {
    const m = makeMaker(10, 'weaving')
    m.skill = 80; m.bobbinsMade = 20; m.smoothness = 90; m.reputation = 85
    ;(sys as any).makers.push(m)
    const r = sys.getMakers()[0]
    expect(r.skill).toBe(80)
    expect(r.bobbinsMade).toBe(20)
    expect(r.smoothness).toBe(90)
    expect(r.reputation).toBe(85)
  })
})
