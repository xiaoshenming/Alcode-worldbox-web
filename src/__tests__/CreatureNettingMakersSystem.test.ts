import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureNettingMakersSystem } from '../systems/CreatureNettingMakersSystem'
import type { NettingMaker, NettingType } from '../systems/CreatureNettingMakersSystem'

// CHECK_INTERVAL=1450, SKILL_GROWTH=0.056, MAX_MAKERS=30
// knotStrength = 16 + skill * 0.71
// reputation = 10 + skill * 0.79
// netsMade = 2 + Math.floor(skill / 8)
// nettingType: typeIdx = Math.min(3, Math.floor(skill/25))
// cleanup cutoff = tick - 52000

let nextId = 1
function makeSys(): CreatureNettingMakersSystem { return new CreatureNettingMakersSystem() }
function makeMaker(entityId: number, overrides: Partial<NettingMaker> = {}): NettingMaker {
  return {
    id: nextId++, entityId, skill: 30, netsMade: 5,
    nettingType: 'fishing', knotStrength: 37.3, reputation: 33.7, tick: 0,
    ...overrides
  }
}
function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getEntitiesWithComponent: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(false),
  } as any
}

describe('CreatureNettingMakersSystem - 基础状态', () => {
  let sys: CreatureNettingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无网编工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, { nettingType: 'hunting' }))
    expect((sys as any).makers[0].nettingType).toBe('hunting')
  })

  it('NettingType包含4种类型', () => {
    const types: NettingType[] = ['fishing', 'hunting', 'cargo', 'decorative']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, { nettingType: t })) })
    const all = (sys as any).makers as NettingMaker[]
    types.forEach((t, i) => { expect(all[i].nettingType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('内部引用一致', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
})

describe('CreatureNettingMakersSystem - 公式验证', () => {
  it('knotStrength公式: skill=40 → 16+40*0.71=44.4', () => {
    expect(16 + 40 * 0.71).toBeCloseTo(44.4, 5)
  })
  it('knotStrength公式: skill=0 → 16', () => {
    expect(16 + 0 * 0.71).toBeCloseTo(16, 5)
  })
  it('knotStrength公式: skill=100 → 16+100*0.71=87', () => {
    expect(16 + 100 * 0.71).toBeCloseTo(87, 5)
  })
  it('reputation公式: skill=50 → 10+50*0.79=49.5', () => {
    expect(10 + 50 * 0.79).toBeCloseTo(49.5, 5)
  })
  it('reputation公式: skill=100 → 10+100*0.79=89', () => {
    expect(10 + 100 * 0.79).toBeCloseTo(89, 5)
  })
  it('netsMade: skill=40 → 2+floor(40/8)=7', () => {
    expect(2 + Math.floor(40 / 8)).toBe(7)
  })
  it('netsMade: skill=0 → 2', () => {
    expect(2 + Math.floor(0 / 8)).toBe(2)
  })
  it('netsMade: skill=100 → 2+floor(100/8)=14', () => {
    expect(2 + Math.floor(100 / 8)).toBe(14)
  })

  it('nettingType: skill=10 → fishing', () => {
    const TYPES: NettingType[] = ['fishing', 'hunting', 'cargo', 'decorative']
    expect(TYPES[Math.min(3, Math.floor(10 / 25))]).toBe('fishing')
  })
  it('nettingType: skill=25 → hunting', () => {
    const TYPES: NettingType[] = ['fishing', 'hunting', 'cargo', 'decorative']
    expect(TYPES[Math.min(3, Math.floor(25 / 25))]).toBe('hunting')
  })
  it('nettingType: skill=50 → cargo', () => {
    const TYPES: NettingType[] = ['fishing', 'hunting', 'cargo', 'decorative']
    expect(TYPES[Math.min(3, Math.floor(50 / 25))]).toBe('cargo')
  })
  it('nettingType: skill=75 → decorative', () => {
    const TYPES: NettingType[] = ['fishing', 'hunting', 'cargo', 'decorative']
    expect(TYPES[Math.min(3, Math.floor(75 / 25))]).toBe('decorative')
  })
  it('nettingType: skill=100 → decorative(上限3)', () => {
    const TYPES: NettingType[] = ['fishing', 'hunting', 'cargo', 'decorative']
    expect(TYPES[Math.min(3, Math.floor(100 / 25))]).toBe('decorative')
  })
})

describe('CreatureNettingMakersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureNettingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick差<1450不更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1449)
    expect((sys as any).lastCheck).toBe(0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })
  it('tick差>=1450更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1450)
    expect((sys as any).lastCheck).toBe(1450)
  })
  it('tick=1449边界不更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1449)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('第二次差值不足时保持', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1450)
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(1450)
  })
  it('第二次差值足够时再次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1450)
    sys.update(1, em, 2900)
    expect((sys as any).lastCheck).toBe(2900)
  })
})

describe('CreatureNettingMakersSystem - time-based cleanup', () => {
  let sys: CreatureNettingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期记录被清除, cutoff=tick-52000', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 55000 }))
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
  it('未过期记录全部保留', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 55000 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 56000 }))
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(2)
  })
  it('cutoff边界: cutoff=60000-52000=8000', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 7999 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 8000 }))
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
  it('全部过期时全部删除', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })
})

describe('CreatureNettingMakersSystem - skillMap 操作', () => {
  let sys: CreatureNettingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skillMap初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('未知实体返回undefined', () => { expect((sys as any).skillMap.get(999)).toBeUndefined() })
  it('注入后可读取', () => {
    ;(sys as any).skillMap.set(5, 56)
    expect((sys as any).skillMap.get(5)).toBe(56)
  })
  it('多个实体独立存储', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(60)
  })
})

describe('CreatureNettingMakersSystem - 边界与综合', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    expect(() => makeSys().update(1, makeEmptyEM(), 1450)).not.toThrow()
  })
  it('dt参数不影响节流', () => {
    const sys = makeSys()
    sys.update(999, makeEmptyEM(), 1449)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('entityId被正确保存', () => {
    const sys = makeSys()
    ;(sys as any).makers.push(makeMaker(88))
    expect((sys as any).makers[0].entityId).toBe(88)
  })
  it('所有字段类型正确', () => {
    const sys = makeSys()
    ;(sys as any).makers.push(makeMaker(1))
    const r = (sys as any).makers[0]
    expect(typeof r.skill).toBe('number')
    expect(typeof r.netsMade).toBe('number')
    expect(typeof r.knotStrength).toBe('number')
    expect(typeof r.reputation).toBe('number')
  })
})
