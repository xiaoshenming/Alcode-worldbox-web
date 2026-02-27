import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureBobbinLaceMakersSystem } from '../systems/CreatureBobbinLaceMakersSystem'
import type { BobbinLaceMaker, LacePattern } from '../systems/CreatureBobbinLaceMakersSystem'

let nextId = 1
function makeSys(): CreatureBobbinLaceMakersSystem { return new CreatureBobbinLaceMakersSystem() }
function makeMaker(entityId: number, pattern: LacePattern = 'torchon'): BobbinLaceMaker {
  return { id: nextId++, entityId, skill: 30, lacePiecesMade: 5, pattern, intricacy: 40, reputation: 35, tick: 0 }
}

describe('CreatureBobbinLaceMakersSystem.getMakers', () => {
  let sys: CreatureBobbinLaceMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无花边师', () => { expect(sys.getMakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, 'honiton'))
    expect(sys.getMakers()[0].pattern).toBe('honiton')
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('支持所有 4 种花边图案', () => {
    const patterns: LacePattern[] = ['torchon', 'cluny', 'bruges', 'honiton']
    patterns.forEach((p, i) => { ;(sys as any).makers.push(makeMaker(i + 1, p)) })
    const all = sys.getMakers()
    patterns.forEach((p, i) => { expect(all[i].pattern).toBe(p) })
  })

  it('数据字段完整', () => {
    const m = makeMaker(10, 'bruges')
    m.skill = 80; m.lacePiecesMade = 20; m.intricacy = 90; m.reputation = 85
    ;(sys as any).makers.push(m)
    const r = sys.getMakers()[0]
    expect(r.skill).toBe(80)
    expect(r.lacePiecesMade).toBe(20)
    expect(r.intricacy).toBe(90)
    expect(r.reputation).toBe(85)
  })
})
