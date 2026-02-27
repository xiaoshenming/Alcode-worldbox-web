import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureCardingMakersSystem } from '../systems/CreatureCardingMakersSystem'
import type { CardingMaker } from '../systems/CreatureCardingMakersSystem'

let nextId = 1
function makeSys(): CreatureCardingMakersSystem { return new CreatureCardingMakersSystem() }
function makeMaker(entityId: number): CardingMaker {
  return { id: nextId++, entityId, combingSkill: 30, fiberAlignment: 25, batchSize: 20, qualityGrade: 35, tick: 0 }
}

describe('CreatureCardingMakersSystem.getMakers', () => {
  let sys: CreatureCardingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无梳棉师', () => { expect(sys.getMakers()).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const m = makeMaker(10)
    m.combingSkill = 80; m.fiberAlignment = 75; m.batchSize = 70; m.qualityGrade = 65
    ;(sys as any).makers.push(m)
    const r = sys.getMakers()[0]
    expect(r.combingSkill).toBe(80); expect(r.fiberAlignment).toBe(75)
    expect(r.batchSize).toBe(70); expect(r.qualityGrade).toBe(65)
  })
})
