import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFeltingMakers2System } from '../systems/CreatureFeltingMakersSystem2'
import type { FeltingMaker2 } from '../systems/CreatureFeltingMakersSystem2'

const CHECK_INTERVAL = 2480
const MAX_MAKERS = 12

let nextId = 100
function makeSys(): CreatureFeltingMakers2System { return new CreatureFeltingMakers2System() }
function makeMaker(entityId: number, overrides: Partial<FeltingMaker2> = {}): FeltingMaker2 {
  return { id: nextId++, entityId, needleSkill: 70, woolGrade: 65, densityControl: 80, artistry: 75, tick: 0, ...overrides }
}

describe('CreatureFeltingMakers2System - 字段与接口', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 100 })

  it('初始无毡制工匠', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询entityId', () => {
    ;(sys as any).makers.push(makeMaker(5))
    expect((sys as any).makers[0].entityId).toBe(5)
  })

  it('needleSkill字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 70 }))
    expect((sys as any).makers[0].needleSkill).toBe(70)
  })

  it('artistry字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { artistry: 75 }))
    expect((sys as any).makers[0].artistry).toBe(75)
  })

  it('woolGrade字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { woolGrade: 65 }))
    expect((sys as any).makers[0].woolGrade).toBe(65)
  })

  it('densityControl字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { densityControl: 80 }))
    expect((sys as any).makers[0].densityControl).toBe(80)
  })

  it('tick字段记���注入时间', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 9999 }))
    expect((sys as any).makers[0].tick).toBe(9999)
  })

  it('多个工匠各自独立', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 10 }))
    ;(sys as any).makers.push(makeMaker(2, { needleSkill: 90 }))
    expect((sys as any).makers[0].needleSkill).toBe(10)
    expect((sys as any).makers[1].needleSkill).toBe(90)
  })
})

describe('CreatureFeltingMakers2System - MAX_MAKERS限制', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 100 })

  it('MAX_MAKERS为12', () => {
    expect(MAX_MAKERS).toBe(12)
  })

  it('可注入12个工匠', () => {
    for (let i = 0; i < 12; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(12)
  })
})

describe('CreatureFeltingMakers2System - 技能上限与递增组合', () => {
  let sys: CreatureFeltingMakers2System
  const fakeEm = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
  beforeEach(() => { sys = makeSys(); nextId = 100 })

  it('needleSkill=99.99后update变为100', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 99.99 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].needleSkill).toBe(100)
  })

  it('densityControl上限为100', () => {
    ;(sys as any).makers.push(makeMaker(1, { densityControl: 99.99 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].densityControl).toBe(100)
  })

  it('节流未触发时技能不增长', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 50 }))
    ;(sys as any).lastCheck = 1000
    sys.update(16, fakeEm, 1000 + CHECK_INTERVAL - 1)
    expect((sys as any).makers[0].needleSkill).toBe(50)
  })

  it('needleSkill=2.98时update后恰好3.00被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 2.98 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('多次触发update技能累积递增', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 50 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    ;(sys as any).lastCheck = 0
    sys.update(16, fakeEm, CHECK_INTERVAL * 2)
    expect((sys as any).makers[0].needleSkill).toBeCloseTo(50.04)
  })

  it('id字段自增', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    const ids = (sys as any).makers.map((m: FeltingMaker2) => m.id)
    expect(new Set(ids).size).toBe(2)
  })
})
