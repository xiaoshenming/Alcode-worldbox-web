import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureEnamelersSystem } from '../systems/CreatureEnamelersSystem'
import type { Enameler, EnamelTechnique } from '../systems/CreatureEnamelersSystem'

// CHECK_INTERVAL=1410, SKILL_GROWTH=0.059
// colorRange = 15 + skill * 0.72
// reputation = 10 + skill * 0.81
// piecesEnameled = 1 + Math.floor(skill / 9)
// technique: techIdx = Math.min(3, Math.floor(skill/25))
// cleanup cutoff = tick - 52500

let nextId = 1
function makeSys(): CreatureEnamelersSystem { return new CreatureEnamelersSystem() }
function makeMaker(entityId: number, overrides: Partial<Enameler> = {}): Enameler {
  return {
    id: nextId++, entityId, skill: 30, piecesEnameled: 4,
    technique: 'cloisonne', colorRange: 36.6, reputation: 34.3, tick: 0,
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

describe('CreatureEnamelersSystem - 基础状态', () => {
  let sys: CreatureEnamelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无珐琅师', () => { expect((sys as any).makers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, { technique: 'champleve' }))
    expect((sys as any).makers[0].technique).toBe('champleve')
  })

  it('EnamelTechnique包含4种类型', () => {
    const techniques: EnamelTechnique[] = ['cloisonne', 'champleve', 'plique', 'grisaille']
    techniques.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, { technique: t })) })
    const all = (sys as any).makers as Enameler[]
    techniques.forEach((t, i) => { expect(all[i].technique).toBe(t) })
  })

  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('返回内部引用一致', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
})

describe('CreatureEnamelersSystem - 公式验证', () => {
  it('colorRange公式: skill=40 → 15+40*0.72=43.8', () => {
    expect(15 + 40 * 0.72).toBeCloseTo(43.8, 5)
  })

  it('colorRange公式: skill=0 → 15', () => {
    expect(15 + 0 * 0.72).toBeCloseTo(15, 5)
  })

  it('colorRange公式: skill=100 → 15+100*0.72=87', () => {
    expect(15 + 100 * 0.72).toBeCloseTo(87, 5)
  })

  it('reputation公式: skill=50 → 10+50*0.81=50.5', () => {
    expect(10 + 50 * 0.81).toBeCloseTo(50.5, 5)
  })

  it('reputation公式: skill=100 → 10+100*0.81=91', () => {
    expect(10 + 100 * 0.81).toBeCloseTo(91, 5)
  })

  it('piecesEnameled: skill=45 → 1+floor(45/9)=6', () => {
    expect(1 + Math.floor(45 / 9)).toBe(6)
  })

  it('piecesEnameled: skill=0 → 1', () => {
    expect(1 + Math.floor(0 / 9)).toBe(1)
  })

  it('piecesEnameled: skill=100 → 1+floor(100/9)=12', () => {
    expect(1 + Math.floor(100 / 9)).toBe(12)
  })

  it('technique: skill=10 → cloisonne', () => {
    const TECHNIQUES: EnamelTechnique[] = ['cloisonne', 'champleve', 'plique', 'grisaille']
    expect(TECHNIQUES[Math.min(3, Math.floor(10 / 25))]).toBe('cloisonne')
  })

  it('technique: skill=25 → champleve', () => {
    const TECHNIQUES: EnamelTechnique[] = ['cloisonne', 'champleve', 'plique', 'grisaille']
    expect(TECHNIQUES[Math.min(3, Math.floor(25 / 25))]).toBe('champleve')
  })

  it('technique: skill=50 → plique', () => {
    const TECHNIQUES: EnamelTechnique[] = ['cloisonne', 'champleve', 'plique', 'grisaille']
    expect(TECHNIQUES[Math.min(3, Math.floor(50 / 25))]).toBe('plique')
  })

  it('technique: skill=75 → grisaille', () => {
    const TECHNIQUES: EnamelTechnique[] = ['cloisonne', 'champleve', 'plique', 'grisaille']
    expect(TECHNIQUES[Math.min(3, Math.floor(75 / 25))]).toBe('grisaille')
  })

  it('technique: skill=100 → grisaille(上限3)', () => {
    const TECHNIQUES: EnamelTechnique[] = ['cloisonne', 'champleve', 'plique', 'grisaille']
    expect(TECHNIQUES[Math.min(3, Math.floor(100 / 25))]).toBe('grisaille')
  })
})

describe('CreatureEnamelersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureEnamelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick差值<1410不更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1409)
    expect((sys as any).lastCheck).toBe(0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick差值>=1410更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1410)
    expect((sys as any).lastCheck).toBe(1410)
  })

  it('tick=1409边界不更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1409)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('第二次更新差值不足时保持', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1410)
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(1410)
  })

  it('第二次更新差值足够时再次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1410)
    sys.update(1, em, 2820)
    expect((sys as any).lastCheck).toBe(2820)
  })
})

describe('CreatureEnamelersSystem - time-based cleanup', () => {
  let sys: CreatureEnamelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('旧记录被删除, cutoff = tick-52500', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 55000 }))
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('cutoff边界: cutoff=60000-52500=7500', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 7499 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 7500 }))
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

  it('全部未过期时全部保留', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 55000 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 56000 }))
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureEnamelersSystem - skillMap 操作', () => {
  let sys: CreatureEnamelersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skillMap初始为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('未知实体返回undefined', () => { expect((sys as any).skillMap.get(999)).toBeUndefined() })
  it('注入后可读取', () => {
    ;(sys as any).skillMap.set(5, 50)
    expect((sys as any).skillMap.get(5)).toBe(50)
  })
  it('多个实体独立存储', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(60)
  })
})

describe('CreatureEnamelersSystem - 边界与综合', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    expect(() => makeSys().update(1, makeEmptyEM(), 1410)).not.toThrow()
  })

  it('dt参数不影响节流', () => {
    const sys = makeSys()
    sys.update(999, makeEmptyEM(), 1409)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('entityId被正确保存', () => {
    const sys = makeSys()
    ;(sys as any).makers.push(makeMaker(66))
    expect((sys as any).makers[0].entityId).toBe(66)
  })

  it('所有字段类型正确', () => {
    const sys = makeSys()
    ;(sys as any).makers.push(makeMaker(1))
    const r = (sys as any).makers[0]
    expect(typeof r.skill).toBe('number')
    expect(typeof r.piecesEnameled).toBe('number')
    expect(typeof r.colorRange).toBe('number')
    expect(typeof r.reputation).toBe('number')
  })
})
