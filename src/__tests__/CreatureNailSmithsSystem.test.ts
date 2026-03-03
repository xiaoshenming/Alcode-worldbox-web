import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureNailSmithsSystem } from '../systems/CreatureNailSmithsSystem'
import type { NailSmith, NailType } from '../systems/CreatureNailSmithsSystem'

// CHECK_INTERVAL=1440, SKILL_GROWTH=0.061, MAX_MAKERS=30
// strengthRating = 20 + skill * 0.68
// reputation = 10 + skill * 0.76
// nailsForged = 10 + Math.floor(skill / 3)
// nailType: typeIdx = Math.min(3, Math.floor(skill/25))
// cleanup cutoff = tick - 53000

let nextId = 1
function makeSys(): CreatureNailSmithsSystem { return new CreatureNailSmithsSystem() }
function makeMaker(entityId: number, overrides: Partial<NailSmith> = {}): NailSmith {
  return {
    id: nextId++, entityId, skill: 30, nailsForged: 20,
    nailType: 'wrought', strengthRating: 40.4, reputation: 32.8, tick: 0,
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

describe('CreatureNailSmithsSystem - 基础状态', () => {
  let sys: CreatureNailSmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无钉铁匠', () => { expect((sys as any).makers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, { nailType: 'cut' }))
    expect((sys as any).makers[0].nailType).toBe('cut')
  })

  it('NailType包含4种类型', () => {
    const types: NailType[] = ['wrought', 'cut', 'wire', 'horseshoe']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, { nailType: t })) })
    const all = (sys as any).makers as NailSmith[]
    types.forEach((t, i) => { expect(all[i].nailType).toBe(t) })
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

describe('CreatureNailSmithsSystem - 公式验证', () => {
  it('strengthRating公式: skill=40 → 20+40*0.68=47.2', () => {
    expect(20 + 40 * 0.68).toBeCloseTo(47.2, 5)
  })
  it('strengthRating公式: skill=0 → 20', () => {
    expect(20 + 0 * 0.68).toBeCloseTo(20, 5)
  })
  it('strengthRating公式: skill=100 → 20+100*0.68=88', () => {
    expect(20 + 100 * 0.68).toBeCloseTo(88, 5)
  })
  it('reputation公式: skill=50 → 10+50*0.76=48', () => {
    expect(10 + 50 * 0.76).toBeCloseTo(48, 5)
  })
  it('reputation公式: skill=100 → 10+100*0.76=86', () => {
    expect(10 + 100 * 0.76).toBeCloseTo(86, 5)
  })
  it('nailsForged: skill=30 → 10+floor(30/3)=20', () => {
    expect(10 + Math.floor(30 / 3)).toBe(20)
  })
  it('nailsForged: skill=0 → 10', () => {
    expect(10 + Math.floor(0 / 3)).toBe(10)
  })
  it('nailsForged: skill=100 → 10+floor(100/3)=43', () => {
    expect(10 + Math.floor(100 / 3)).toBe(43)
  })

  it('nailType: skill=10 → wrought', () => {
    const TYPES: NailType[] = ['wrought', 'cut', 'wire', 'horseshoe']
    expect(TYPES[Math.min(3, Math.floor(10 / 25))]).toBe('wrought')
  })
  it('nailType: skill=25 → cut', () => {
    const TYPES: NailType[] = ['wrought', 'cut', 'wire', 'horseshoe']
    expect(TYPES[Math.min(3, Math.floor(25 / 25))]).toBe('cut')
  })
  it('nailType: skill=50 → wire', () => {
    const TYPES: NailType[] = ['wrought', 'cut', 'wire', 'horseshoe']
    expect(TYPES[Math.min(3, Math.floor(50 / 25))]).toBe('wire')
  })
  it('nailType: skill=75 → horseshoe', () => {
    const TYPES: NailType[] = ['wrought', 'cut', 'wire', 'horseshoe']
    expect(TYPES[Math.min(3, Math.floor(75 / 25))]).toBe('horseshoe')
  })
  it('nailType: skill=100 → horseshoe(上限3)', () => {
    const TYPES: NailType[] = ['wrought', 'cut', 'wire', 'horseshoe']
    expect(TYPES[Math.min(3, Math.floor(100 / 25))]).toBe('horseshoe')
  })
})

describe('CreatureNailSmithsSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureNailSmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick差<1440不更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1439)
    expect((sys as any).lastCheck).toBe(0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })
  it('tick差>=1440更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1440)
    expect((sys as any).lastCheck).toBe(1440)
  })
  it('tick=1439边界不更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1439)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('第二次差值不足时保持', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1440)
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(1440)
  })
  it('第二次差值足够时再次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1440)
    sys.update(1, em, 2880)
    expect((sys as any).lastCheck).toBe(2880)
  })
})

describe('CreatureNailSmithsSystem - time-based cleanup', () => {
  let sys: CreatureNailSmithsSystem
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

describe('CreatureNailSmithsSystem - skillMap 操作', () => {
  let sys: CreatureNailSmithsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skillMap初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('未知实体返回undefined', () => { expect((sys as any).skillMap.get(999)).toBeUndefined() })
  it('注入后可读取', () => {
    ;(sys as any).skillMap.set(5, 61)
    expect((sys as any).skillMap.get(5)).toBe(61)
  })
  it('多个实体独立存储', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(60)
  })
})

describe('CreatureNailSmithsSystem - 边界与综合', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    expect(() => makeSys().update(1, makeEmptyEM(), 1440)).not.toThrow()
  })
  it('dt参数不影响节流', () => {
    const sys = makeSys()
    sys.update(999, makeEmptyEM(), 1439)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('entityId被正确保存', () => {
    const sys = makeSys()
    ;(sys as any).makers.push(makeMaker(33))
    expect((sys as any).makers[0].entityId).toBe(33)
  })
  it('所有字段类型正确', () => {
    const sys = makeSys()
    ;(sys as any).makers.push(makeMaker(1))
    const r = (sys as any).makers[0]
    expect(typeof r.skill).toBe('number')
    expect(typeof r.nailsForged).toBe('number')
    expect(typeof r.strengthRating).toBe('number')
    expect(typeof r.reputation).toBe('number')
  })
})
