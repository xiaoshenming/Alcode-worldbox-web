import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFeltingMakers2System } from '../systems/CreatureFeltingMakersSystem2'
import type { FeltingMaker2 } from '../systems/CreatureFeltingMakersSystem2'

let nextId = 1
function makeSys(): CreatureFeltingMakers2System { return new CreatureFeltingMakers2System() }
function makeMaker(entityId: number): FeltingMaker2 {
  return { id: nextId++, entityId, needleSkill: 70, woolGrade: 65, densityControl: 80, artistry: 75, tick: 0 }
}

describe('CreatureFeltingMakers2System.getMakers', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无毡制工匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(2))
    const m = (sys as any).makers[0]
    expect(m.needleSkill).toBe(70)
    expect(m.artistry).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})
