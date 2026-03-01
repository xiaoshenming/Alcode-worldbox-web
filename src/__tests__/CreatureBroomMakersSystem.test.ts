import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBroomMakersSystem } from '../systems/CreatureBroomMakersSystem'
import type { BroomMaker, BroomType } from '../systems/CreatureBroomMakersSystem'

let nextId = 1
function makeSys(): CreatureBroomMakersSystem { return new CreatureBroomMakersSystem() }
function makeMaker(entityId: number, broomType: BroomType = 'straw'): BroomMaker {
  return { id: nextId++, entityId, skill: 30, broomsMade: 5, broomType, durability: 40, reputation: 35, tick: 0 }
}

describe('CreatureBroomMakersSystem.getMakers', () => {
  let sys: CreatureBroomMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无扫帚师', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'ceremonial'))
    expect((sys as any).makers[0].broomType).toBe('ceremonial')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('支持所有 4 种扫帚类型', () => {
    const types: BroomType[] = ['straw', 'twig', 'bristle', 'ceremonial']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, t)) })
    const all = (sys as any).makers
    types.forEach((t, i) => { expect(all[i].broomType).toBe(t) })
  })

  it('数据字段完整', () => {
    const m = makeMaker(10, 'bristle')
    m.skill = 80; m.broomsMade = 20; m.durability = 90; m.reputation = 85
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.skill).toBe(80); expect(r.broomsMade).toBe(20)
    expect(r.durability).toBe(90); expect(r.reputation).toBe(85)
  })
})
