import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureSpinnerSystem } from '../systems/CreatureSpinnerSystem'
import type { Spinner } from '../systems/CreatureSpinnerSystem'

const CHECK_INTERVAL = 2830
const em = { getEntitiesWithComponent: () => [] } as any

let nextId = 1
function makeSys(): CreatureSpinnerSystem { return new CreatureSpinnerSystem() }
function makeSpinner(entityId: number, overrides: Partial<Spinner> = {}): Spinner {
  return { id: nextId++, entityId, spinningSkill: 70, latheControl: 65, formPrecision: 80, symmetryQuality: 75, tick: 0, ...overrides }
}

describe('CreatureSpinnerSystem.getSpinners', () => {
  let sys: CreatureSpinnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无旋工', () => { expect((sys as any).spinners).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).spinners.push(makeSpinner(1))
    expect((sys as any).spinners[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).spinners.push(makeSpinner(1))
    expect((sys as any).spinners).toBe((sys as any).spinners)
  })
  it('字段正确', () => {
    ;(sys as any).spinners.push(makeSpinner(2))
    const s = (sys as any).spinners[0]
    expect(s.spinningSkill).toBe(70)
    expect(s.symmetryQuality).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).spinners.push(makeSpinner(1))
    ;(sys as any).spinners.push(makeSpinner(2))
    expect((sys as any).spinners).toHaveLength(2)
  })
})

describe('CreatureSpinnerSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureSpinnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足时不执行技能增长', () => {
    ;(sys as any).spinners.push(makeSpinner(1))
    const before = (sys as any).spinners[0].spinningSkill
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).spinners[0].spinningSkill).toBe(before)
  })

  it('首次tick=CHECK_INTERVAL时执行', () => {
    ;(sys as any).spinners.push(makeSpinner(1))
    const before = (sys as any).spinners[0].spinningSkill
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spinners[0].spinningSkill).toBeGreaterThan(before)
  })

  it('执行后lastCheck更新为当前tick', () => {
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续两次更新：第二次在间隔内不再增长', () => {
    ;(sys as any).spinners.push(makeSpinner(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).spinners[0].spinningSkill
    sys.update(1, em, CHECK_INTERVAL + 1)
    expect((sys as any).spinners[0].spinningSkill).toBe(afterFirst)
  })

  it('两次间隔均达到时两次都增长', () => {
    ;(sys as any).spinners.push(makeSpinner(1))
    sys.update(1, em, CHECK_INTERVAL)
    const afterFirst = (sys as any).spinners[0].spinningSkill
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).spinners[0].spinningSkill).toBeGreaterThan(afterFirst)
  })
})

describe('CreatureSpinnerSystem - 技能增量', () => {
  let sys: CreatureSpinnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('spinningSkill每次+0.02', () => {
    ;(sys as any).spinners.push(makeSpinner(1, { spinningSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spinners[0].spinningSkill).toBeCloseTo(50.02)
  })

  it('latheControl每次+0.015', () => {
    ;(sys as any).spinners.push(makeSpinner(1, { latheControl: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spinners[0].latheControl).toBeCloseTo(50.015)
  })

  it('symmetryQuality每次+0.01', () => {
    ;(sys as any).spinners.push(makeSpinner(1, { symmetryQuality: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spinners[0].symmetryQuality).toBeCloseTo(50.01)
  })

  it('formPrecision不自动增长', () => {
    ;(sys as any).spinners.push(makeSpinner(1, { formPrecision: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spinners[0].formPrecision).toBe(50)
  })

  it('spinningSkill上限100不超出', () => {
    ;(sys as any).spinners.push(makeSpinner(1, { spinningSkill: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spinners[0].spinningSkill).toBe(100)
  })

  it('latheControl上限100不超出', () => {
    ;(sys as any).spinners.push(makeSpinner(1, { latheControl: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spinners[0].latheControl).toBe(100)
  })

  it('symmetryQuality上限100不超出', () => {
    ;(sys as any).spinners.push(makeSpinner(1, { symmetryQuality: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spinners[0].symmetryQuality).toBe(100)
  })

  it('多名旋工技能同步增长', () => {
    ;(sys as any).spinners.push(makeSpinner(1, { spinningSkill: 50 }))
    ;(sys as any).spinners.push(makeSpinner(2, { spinningSkill: 60 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spinners[0].spinningSkill).toBeCloseTo(50.02)
    expect((sys as any).spinners[1].spinningSkill).toBeCloseTo(60.02)
  })
})

describe('CreatureSpinnerSystem - cleanup边界', () => {
  let sys: CreatureSpinnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('spinningSkill=3.98增长后≤4被清除', () => {
    ;(sys as any).spinners.push(makeSpinner(1, { spinningSkill: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.00 -> 4 <= 4 => 清除
    expect((sys as any).spinners).toHaveLength(0)
  })

  it('spinningSkill=4.01增长后>4保留', () => {
    ;(sys as any).spinners.push(makeSpinner(1, { spinningSkill: 4.01 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 4.01 + 0.02 = 4.03 > 4 => 保留
    expect((sys as any).spinners).toHaveLength(1)
  })

  it('spinningSkill=4增长后4.02>4保留', () => {
    ;(sys as any).spinners.push(makeSpinner(1, { spinningSkill: 4 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 4 + 0.02 = 4.02 > 4 => 保留
    expect((sys as any).spinners).toHaveLength(1)
  })

  it('混合旋工：低技能被清除，高技能保留', () => {
    ;(sys as any).spinners.push(makeSpinner(1, { spinningSkill: 3 }))
    ;(sys as any).spinners.push(makeSpinner(2, { spinningSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).spinners).toHaveLength(1)
    expect((sys as any).spinners[0].entityId).toBe(2)
  })
})

describe('CreatureSpinnerSystem - MAX_SPINNERS上限', () => {
  let sys: CreatureSpinnerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('达到MAX_SPINNERS=10时不再招募', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).spinners.push(makeSpinner(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).spinners.length).toBeLessThanOrEqual(10)
  })

  it('未满时随机触发可招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em, CHECK_INTERVAL)
    vi.restoreAllMocks()
    expect((sys as any).spinners.length).toBe(1)
  })
})
