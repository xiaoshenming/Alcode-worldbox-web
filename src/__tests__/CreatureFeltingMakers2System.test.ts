import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFeltingMakers2System } from '../systems/CreatureFeltingMakersSystem2'
import type { FeltingMaker2 } from '../systems/CreatureFeltingMakersSystem2'

let nextId = 1
function makeSys(): CreatureFeltingMakers2System { return new CreatureFeltingMakers2System() }
function makeMaker(entityId: number): FeltingMaker2 {
  return { id: nextId++, entityId, needleSkill: 50, woolGrade: 60, densityControl: 70, artistry: 80, tick: 0 }
}

describe('CreatureFeltingMakers2System.getMakers', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无制毡工', () => { expect(sys.getMakers()).toHaveLength(0) })

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
    m.needleSkill = 90; m.woolGrade = 85; m.densityControl = 80; m.artistry = 75
    ;(sys as any).makers.push(m)
    const r = sys.getMakers()[0]
    expect(r.needleSkill).toBe(90); expect(r.woolGrade).toBe(85)
    expect(r.densityControl).toBe(80); expect(r.artistry).toBe(75)
  })
})
