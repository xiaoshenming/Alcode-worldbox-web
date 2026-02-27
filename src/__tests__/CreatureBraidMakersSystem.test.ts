import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBraidMakersSystem } from '../systems/CreatureBraidMakersSystem'
import type { BraidMaker, BraidType } from '../systems/CreatureBraidMakersSystem'

let nextId = 1
function makeSys(): CreatureBraidMakersSystem { return new CreatureBraidMakersSystem() }
function makeMaker(entityId: number, braidType: BraidType = 'cord'): BraidMaker {
  return { id: nextId++, entityId, skill: 30, braidsMade: 5, braidType, tension: 40, reputation: 35, tick: 0 }
}

describe('CreatureBraidMakersSystem.getMakers', () => {
  let sys: CreatureBraidMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无编绳师', () => { expect(sys.getMakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'gimp'))
    expect(sys.getMakers()[0].braidType).toBe('gimp')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('支持所有 4 种编绳类型', () => {
    const types: BraidType[] = ['cord', 'trim', 'soutache', 'gimp']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = sys.getMakers()
    types.forEach((t, i) => { expect(all[i].braidType).toBe(t) })
  })

  it('数据字段完整', () => {
    const m = makeMaker(10, 'trim')
    m.skill = 80; m.braidsMade = 20; m.tension = 90; m.reputation = 85
    ;(sys as any).makers.push(m)
    const r = sys.getMakers()[0]
    expect(r.skill).toBe(80); expect(r.braidsMade).toBe(20)
    expect(r.tension).toBe(90); expect(r.reputation).toBe(85)
  })
})
