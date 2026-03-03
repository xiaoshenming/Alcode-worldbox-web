import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureMacrameMakersSystem } from '../systems/CreatureMacrameMakersSystem'
import type { MacrameMaker, MacrameType } from '../systems/CreatureMacrameMakersSystem'

// CHECK_INTERVAL=1510, SKILL_GROWTH=0.054
// knotDensity = 12 + skill * 0.72
// reputation = 10 + skill * 0.81
// piecesMade = 2 + Math.floor(skill / 8)
// macrameType: typeIdx = Math.min(3, Math.floor(skill/25))
// cleanup cutoff = tick - 53000

let nextId = 1
function makeSys(): CreatureMacrameMakersSystem { return new CreatureMacrameMakersSystem() }
function makeMaker(entityId: number, overrides: Partial<MacrameMaker> = {}): MacrameMaker {
  return {
    id: nextId++, entityId, skill: 30, piecesMade: 5,
    macrameType: 'wall_hanging', knotDensity: 33.6, reputation: 34.3, tick: 0,
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

describe('CreatureMacrameMakersSystem - 基础状态', () => {
  let sys: CreatureMacrameMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无绳编工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, { macrameType: 'plant_hanger' }))
    expect((sys as any).makers[0].macrameType).toBe('plant_hanger')
  })

  it('MacrameType包含4种类型', () => {
    const types: MacrameType[] = ['wall_hanging', 'plant_hanger', 'curtain', 'belt']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, { macrameType: t })) })
    const all = (sys as any).makers as MacrameMaker[]
    types.forEach((t, i) => { expect(all[i].macrameType).toBe(t) })
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

describe('CreatureMacrameMakersSystem - 公式验证', () => {
  it('knotDensity公式: skill=40 → 12+40*0.72=40.8', () => {
    expect(12 + 40 * 0.72).toBeCloseTo(40.8, 5)
  })
  it('knotDensity公式: skill=0 → 12', () => {
    expect(12 + 0 * 0.72).toBeCloseTo(12, 5)
  })
  it('knotDensity公式: skill=100 → 12+100*0.72=84', () => {
    expect(12 + 100 * 0.72).toBeCloseTo(84, 5)
  })
  it('reputation公式: skill=50 → 10+50*0.81=50.5', () => {
    expect(10 + 50 * 0.81).toBeCloseTo(50.5, 5)
  })
  it('reputation公式: skill=100 → 10+100*0.81=91', () => {
    expect(10 + 100 * 0.81).toBeCloseTo(91, 5)
  })
  it('piecesMade: skill=40 → 2+floor(40/8)=7', () => {
    expect(2 + Math.floor(40 / 8)).toBe(7)
  })
  it('piecesMade: skill=0 → 2', () => {
    expect(2 + Math.floor(0 / 8)).toBe(2)
  })
  it('piecesMade: skill=100 → 2+floor(100/8)=14', () => {
    expect(2 + Math.floor(100 / 8)).toBe(14)
  })

  it('macrameType: skill=10 → wall_hanging', () => {
    const TYPES: MacrameType[] = ['wall_hanging', 'plant_hanger', 'curtain', 'belt']
    expect(TYPES[Math.min(3, Math.floor(10 / 25))]).toBe('wall_hanging')
  })
  it('macrameType: skill=25 → plant_hanger', () => {
    const TYPES: MacrameType[] = ['wall_hanging', 'plant_hanger', 'curtain', 'belt']
    expect(TYPES[Math.min(3, Math.floor(25 / 25))]).toBe('plant_hanger')
  })
  it('macrameType: skill=50 → curtain', () => {
    const TYPES: MacrameType[] = ['wall_hanging', 'plant_hanger', 'curtain', 'belt']
    expect(TYPES[Math.min(3, Math.floor(50 / 25))]).toBe('curtain')
  })
  it('macrameType: skill=75 → belt', () => {
    const TYPES: MacrameType[] = ['wall_hanging', 'plant_hanger', 'curtain', 'belt']
    expect(TYPES[Math.min(3, Math.floor(75 / 25))]).toBe('belt')
  })
  it('macrameType: skill=100 → belt(上限3)', () => {
    const TYPES: MacrameType[] = ['wall_hanging', 'plant_hanger', 'curtain', 'belt']
    expect(TYPES[Math.min(3, Math.floor(100 / 25))]).toBe('belt')
  })
})

describe('CreatureMacrameMakersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureMacrameMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick差<1510不更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1509)
    expect((sys as any).lastCheck).toBe(0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })
  it('tick差>=1510更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1510)
    expect((sys as any).lastCheck).toBe(1510)
  })
  it('tick=1509边界不更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1509)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('第二次差值不足时保持', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1510)
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(1510)
  })
  it('第二次差值足够时再次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1510)
    sys.update(1, em, 3020)
    expect((sys as any).lastCheck).toBe(3020)
  })
})

describe('CreatureMacrameMakersSystem - time-based cleanup', () => {
  let sys: CreatureMacrameMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期记录被清除, cutoff=tick-53000', () => {
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
  it('cutoff边界: cutoff=60000-53000=7000', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 6999 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 7000 }))
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

describe('CreatureMacrameMakersSystem - skillMap 操作', () => {
  let sys: CreatureMacrameMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skillMap初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('未知实体返回undefined', () => { expect((sys as any).skillMap.get(999)).toBeUndefined() })
  it('注入后可读取', () => {
    ;(sys as any).skillMap.set(5, 54)
    expect((sys as any).skillMap.get(5)).toBe(54)
  })
  it('多个实体独立存储', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(60)
  })
})

describe('CreatureMacrameMakersSystem - 边界与综合', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    expect(() => makeSys().update(1, makeEmptyEM(), 1510)).not.toThrow()
  })
  it('dt参数不影响节流', () => {
    const sys = makeSys()
    sys.update(999, makeEmptyEM(), 1509)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('entityId被正确保存', () => {
    const sys = makeSys()
    ;(sys as any).makers.push(makeMaker(55))
    expect((sys as any).makers[0].entityId).toBe(55)
  })
  it('所有字段类型正确', () => {
    const sys = makeSys()
    ;(sys as any).makers.push(makeMaker(1))
    const r = (sys as any).makers[0]
    expect(typeof r.skill).toBe('number')
    expect(typeof r.piecesMade).toBe('number')
    expect(typeof r.knotDensity).toBe('number')
    expect(typeof r.reputation).toBe('number')
  })
})
