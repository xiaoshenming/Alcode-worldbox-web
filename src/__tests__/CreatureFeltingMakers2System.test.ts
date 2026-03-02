import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureFeltingMakers2System } from '../systems/CreatureFeltingMakersSystem2'
import type { FeltingMaker2 } from '../systems/CreatureFeltingMakersSystem2'

const CHECK_INTERVAL = 2480

let nextId = 1
function makeSys(): CreatureFeltingMakers2System { return new CreatureFeltingMakers2System() }
function makeMaker(entityId: number, overrides: Partial<FeltingMaker2> = {}): FeltingMaker2 {
  return { id: nextId++, entityId, needleSkill: 50, woolGrade: 60, densityControl: 70, artistry: 80, tick: 0, ...overrides }
}

describe('CreatureFeltingMakers2System - 基础结构', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无制毡工', () => { expect((sys as any).makers).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })

  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('四字段数据完整', () => {
    const m = makeMaker(10, { needleSkill: 90, woolGrade: 85, densityControl: 80, artistry: 75 })
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.needleSkill).toBe(90); expect(r.woolGrade).toBe(85)
    expect(r.densityControl).toBe(80); expect(r.artistry).toBe(75)
  })
})

describe('CreatureFeltingMakers2System - CHECK_INTERVAL 节流', () => {
  let sys: CreatureFeltingMakers2System
  const fakeEm = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值 < CHECK_INTERVAL 不更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, fakeEm, 1000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(1000)
  })

  it('tick差值 === CHECK_INTERVAL 时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick差值 > CHECK_INTERVAL 时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, fakeEm, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })

  it('第一次update(tick=0)不通过节流', () => {
    const before = (sys as any).lastCheck
    sys.update(16, fakeEm, 0)
    expect((sys as any).lastCheck).toBe(before)
  })
})

describe('CreatureFeltingMakers2System - 技能递增', () => {
  let sys: CreatureFeltingMakers2System
  const fakeEm = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('needleSkill 每次+0.02', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 50 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].needleSkill).toBeCloseTo(50.02)
  })

  it('artistry 每次+0.015', () => {
    ;(sys as any).makers.push(makeMaker(1, { artistry: 80 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].artistry).toBeCloseTo(80.015)
  })

  it('densityControl 每次+0.01', () => {
    ;(sys as any).makers.push(makeMaker(1, { densityControl: 70 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].densityControl).toBeCloseTo(70.01)
  })

  it('needleSkill上限为100', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 99.99 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].needleSkill).toBe(100)
  })

  it('artistry上限为100', () => {
    ;(sys as any).makers.push(makeMaker(1, { artistry: 99.99 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].artistry).toBe(100)
  })
})

describe('CreatureFeltingMakers2System - cleanup 机制', () => {
  let sys: CreatureFeltingMakers2System
  const fakeEm = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('needleSkill > 3 时不被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 4 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('needleSkill=2.98时update后变3.00被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 2.98 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('needleSkill < 3 时被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 1 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('混合时只保留needleSkill>3的工匠', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 50 }))
    ;(sys as any).makers.push(makeMaker(2, { needleSkill: 2 }))
    ;(sys as any).makers.push(makeMaker(3, { needleSkill: 60 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(2)
    expect((sys as any).makers.every((m: FeltingMaker2) => m.needleSkill > 3)).toBe(true)
  })
})
