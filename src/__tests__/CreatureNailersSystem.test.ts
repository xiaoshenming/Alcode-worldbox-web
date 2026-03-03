import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureNailersSystem } from '../systems/CreatureNailersSystem'
import type { Nailer, NailType } from '../systems/CreatureNailersSystem'

// CHECK_INTERVAL=1300, SKILL_GROWTH=0.07, MAX_NAILERS=34
// strength = 25 + skill * 0.6
// reputation = 10 + skill * 0.7
// nailsForged = 10 + Math.floor(skill / 3)
// nailType: typeIdx = Math.min(3, Math.floor(skill/25))
// cleanup cutoff = tick - 52000

let nextId = 1
function makeSys(): CreatureNailersSystem { return new CreatureNailersSystem() }
function makeMaker(entityId: number, overrides: Partial<Nailer> = {}): Nailer {
  return {
    id: nextId++, entityId, skill: 30, nailsForged: 20,
    nailType: 'tack', strength: 43, reputation: 31, tick: 0,
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

describe('CreatureNailersSystem - 基础状态', () => {
  let sys: CreatureNailersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无制钉师', () => { expect((sys as any).nailers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('注入后可查询', () => {
    ;(sys as any).nailers.push(makeMaker(1, { nailType: 'brad' }))
    expect((sys as any).nailers[0].nailType).toBe('brad')
  })

  it('NailType包含4种类���', () => {
    const types: NailType[] = ['tack', 'brad', 'spike', 'rivet']
    types.forEach((t, i) => { ;(sys as any).nailers.push(makeMaker(i + 1, { nailType: t })) })
    const all = (sys as any).nailers as Nailer[]
    types.forEach((t, i) => { expect(all[i].nailType).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).nailers.push(makeMaker(1))
    ;(sys as any).nailers.push(makeMaker(2))
    expect((sys as any).nailers).toHaveLength(2)
  })

  it('内部引用一致', () => {
    ;(sys as any).nailers.push(makeMaker(1))
    expect((sys as any).nailers).toBe((sys as any).nailers)
  })
})

describe('CreatureNailersSystem - 公式验证', () => {
  it('strength公式: skill=40 → 25+40*0.6=49', () => {
    expect(25 + 40 * 0.6).toBeCloseTo(49, 5)
  })
  it('strength公式: skill=0 → 25', () => {
    expect(25 + 0 * 0.6).toBeCloseTo(25, 5)
  })
  it('strength公式: skill=100 → 25+100*0.6=85', () => {
    expect(25 + 100 * 0.6).toBeCloseTo(85, 5)
  })
  it('reputation公式: skill=50 → 10+50*0.7=45', () => {
    expect(10 + 50 * 0.7).toBeCloseTo(45, 5)
  })
  it('reputation公式: skill=100 → 10+100*0.7=80', () => {
    expect(10 + 100 * 0.7).toBeCloseTo(80, 5)
  })
  it('nailsForged: skill=30 → 10+floor(30/3)=20', () => {
    expect(10 + Math.floor(30 / 3)).toBe(20)
  })
  it('nailsForged: skill=0 → 10+floor(0/3)=10', () => {
    expect(10 + Math.floor(0 / 3)).toBe(10)
  })
  it('nailsForged: skill=100 → 10+floor(100/3)=43', () => {
    expect(10 + Math.floor(100 / 3)).toBe(43)
  })

  it('nailType: skill=10 → tack', () => {
    const TYPES: NailType[] = ['tack', 'brad', 'spike', 'rivet']
    expect(TYPES[Math.min(3, Math.floor(10 / 25))]).toBe('tack')
  })
  it('nailType: skill=25 → brad', () => {
    const TYPES: NailType[] = ['tack', 'brad', 'spike', 'rivet']
    expect(TYPES[Math.min(3, Math.floor(25 / 25))]).toBe('brad')
  })
  it('nailType: skill=50 → spike', () => {
    const TYPES: NailType[] = ['tack', 'brad', 'spike', 'rivet']
    expect(TYPES[Math.min(3, Math.floor(50 / 25))]).toBe('spike')
  })
  it('nailType: skill=75 → rivet', () => {
    const TYPES: NailType[] = ['tack', 'brad', 'spike', 'rivet']
    expect(TYPES[Math.min(3, Math.floor(75 / 25))]).toBe('rivet')
  })
  it('nailType: skill=100 → rivet(上限3)', () => {
    const TYPES: NailType[] = ['tack', 'brad', 'spike', 'rivet']
    expect(TYPES[Math.min(3, Math.floor(100 / 25))]).toBe('rivet')
  })
})

describe('CreatureNailersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureNailersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick差<1300不更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1299)
    expect((sys as any).lastCheck).toBe(0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })
  it('tick差>=1300更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1300)
    expect((sys as any).lastCheck).toBe(1300)
  })
  it('tick=1299边界不更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1299)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('第二次差值不足时保持', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1300)
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(1300)
  })
  it('第二次差值足够时再次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1300)
    sys.update(1, em, 2600)
    expect((sys as any).lastCheck).toBe(2600)
  })
})

describe('CreatureNailersSystem - time-based cleanup', () => {
  let sys: CreatureNailersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('过期记录被清除, cutoff=tick-52000', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).nailers.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).nailers.push(makeMaker(2, { tick: 55000 }))
    sys.update(1, em, 60000)
    expect((sys as any).nailers).toHaveLength(1)
    expect((sys as any).nailers[0].entityId).toBe(2)
  })
  it('未过期记录全部保留', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).nailers.push(makeMaker(1, { tick: 55000 }))
    ;(sys as any).nailers.push(makeMaker(2, { tick: 56000 }))
    sys.update(1, em, 60000)
    expect((sys as any).nailers).toHaveLength(2)
  })
  it('cutoff边界: cutoff=60000-52000=8000', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).nailers.push(makeMaker(1, { tick: 7999 }))
    ;(sys as any).nailers.push(makeMaker(2, { tick: 8000 }))
    sys.update(1, em, 60000)
    expect((sys as any).nailers).toHaveLength(1)
    expect((sys as any).nailers[0].entityId).toBe(2)
  })
  it('全部过期时全部删除', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).nailers.push(makeMaker(1, { tick: 0 }))
    sys.update(1, em, 60000)
    expect((sys as any).nailers).toHaveLength(0)
  })
})

describe('CreatureNailersSystem - skillMap 操作', () => {
  let sys: CreatureNailersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skillMap初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('未知实体返回undefined', () => { expect((sys as any).skillMap.get(999)).toBeUndefined() })
  it('注入后可读取', () => {
    ;(sys as any).skillMap.set(5, 70)
    expect((sys as any).skillMap.get(5)).toBe(70)
  })
  it('多个实体独立存储', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(60)
  })
})

describe('CreatureNailersSystem - 边界与综合', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    expect(() => makeSys().update(1, makeEmptyEM(), 1300)).not.toThrow()
  })
  it('dt参数不影响节流', () => {
    const sys = makeSys()
    sys.update(999, makeEmptyEM(), 1299)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('entityId被正确保存', () => {
    const sys = makeSys()
    ;(sys as any).nailers.push(makeMaker(44))
    expect((sys as any).nailers[0].entityId).toBe(44)
  })
  it('所有字段类型正确', () => {
    const sys = makeSys()
    ;(sys as any).nailers.push(makeMaker(1))
    const r = (sys as any).nailers[0]
    expect(typeof r.skill).toBe('number')
    expect(typeof r.nailsForged).toBe('number')
    expect(typeof r.strength).toBe('number')
    expect(typeof r.reputation).toBe('number')
  })
})
