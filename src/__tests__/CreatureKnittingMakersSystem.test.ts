import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureKnittingMakersSystem } from '../systems/CreatureKnittingMakersSystem'
import type { KnittingMaker } from '../systems/CreatureKnittingMakersSystem'

let nextId = 1
function makeSys(): CreatureKnittingMakersSystem { return new CreatureKnittingMakersSystem() }
function makeMaker(entityId: number): KnittingMaker {
  return { id: nextId++, entityId, skillLevel: 70, yarnQuality: 65, patternComplexity: 60, outputRate: 80, tick: 0 }
}

describe('CreatureKnittingMakersSystem.getMakers', () => {
  let sys: CreatureKnittingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无编织师', () => { expect(sys.getMakers()).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(sys.getMakers()).toBe((sys as any).makers)
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(5))
    const m = sys.getMakers()[0]
    expect(m.skillLevel).toBe(70)
    expect(m.outputRate).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect(sys.getMakers()).toHaveLength(2)
  })
})
