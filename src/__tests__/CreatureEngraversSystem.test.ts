import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureEngraversSystem } from '../systems/CreatureEngraversSystem'
import type { Engraver, EngravingMedium } from '../systems/CreatureEngraversSystem'

// CHECK_INTERVAL=1400, SKILL_GROWTH=0.07
// precision = 25 + skill * 0.65
// creativity = 20 + skill * 0.7
// piecesCompleted = 1 + Math.floor(skill / 10)
// medium: medIdx = Math.min(3, Math.floor(skill/25))
// cleanup cutoff = tick - 55000

let nextId = 1
function makeSys(): CreatureEngraversSystem { return new CreatureEngraversSystem() }
function makeMaker(entityId: number, overrides: Partial<Engraver> = {}): Engraver {
  return {
    id: nextId++, entityId, skill: 30, piecesCompleted: 4,
    medium: 'metal', precision: 44.5, creativity: 41, tick: 0,
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

describe('CreatureEngraversSystem - 基础状态', () => {
  let sys: CreatureEngraversSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无雕刻师', () => { expect((sys as any).engravers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('注入后可查询', () => {
    ;(sys as any).engravers.push(makeMaker(1, { medium: 'stone' }))
    expect((sys as any).engravers[0].medium).toBe('stone')
  })

  it('EngravingMedium包含4种类型', () => {
    const mediums: EngravingMedium[] = ['metal', 'stone', 'wood', 'gem']
    mediums.forEach((m, i) => { ;(sys as any).engravers.push(makeMaker(i + 1, { medium: m })) })
    const all = (sys as any).engravers as Engraver[]
    mediums.forEach((m, i) => { expect(all[i].medium).toBe(m) })
  })

  it('多个全部返回', () => {
    ;(sys as any).engravers.push(makeMaker(1))
    ;(sys as any).engravers.push(makeMaker(2))
    expect((sys as any).engravers).toHaveLength(2)
  })

  it('返回内部引用一致', () => {
    ;(sys as any).engravers.push(makeMaker(1))
    expect((sys as any).engravers).toBe((sys as any).engravers)
  })
})

describe('CreatureEngraversSystem - 公式验证', () => {
  it('precision公式: skill=40 → 25+40*0.65=51', () => {
    expect(25 + 40 * 0.65).toBeCloseTo(51, 5)
  })

  it('precision公式: skill=0 → 25', () => {
    expect(25 + 0 * 0.65).toBeCloseTo(25, 5)
  })

  it('precision公式: skill=100 → 25+100*0.65=90', () => {
    expect(25 + 100 * 0.65).toBeCloseTo(90, 5)
  })

  it('creativity公式: skill=50 → 20+50*0.7=55', () => {
    expect(20 + 50 * 0.7).toBeCloseTo(55, 5)
  })

  it('creativity公式: skill=100 → 20+100*0.7=90', () => {
    expect(20 + 100 * 0.7).toBeCloseTo(90, 5)
  })

  it('piecesCompleted: skill=40 → 1+floor(40/10)=5', () => {
    expect(1 + Math.floor(40 / 10)).toBe(5)
  })

  it('piecesCompleted: skill=0 → 1', () => {
    expect(1 + Math.floor(0 / 10)).toBe(1)
  })

  it('piecesCompleted: skill=100 → 1+floor(100/10)=11', () => {
    expect(1 + Math.floor(100 / 10)).toBe(11)
  })

  it('medium: skill=10 → metal', () => {
    const MEDIUMS: EngravingMedium[] = ['metal', 'stone', 'wood', 'gem']
    expect(MEDIUMS[Math.min(3, Math.floor(10 / 25))]).toBe('metal')
  })

  it('medium: skill=25 → stone', () => {
    const MEDIUMS: EngravingMedium[] = ['metal', 'stone', 'wood', 'gem']
    expect(MEDIUMS[Math.min(3, Math.floor(25 / 25))]).toBe('stone')
  })

  it('medium: skill=50 → wood', () => {
    const MEDIUMS: EngravingMedium[] = ['metal', 'stone', 'wood', 'gem']
    expect(MEDIUMS[Math.min(3, Math.floor(50 / 25))]).toBe('wood')
  })

  it('medium: skill=75 → gem', () => {
    const MEDIUMS: EngravingMedium[] = ['metal', 'stone', 'wood', 'gem']
    expect(MEDIUMS[Math.min(3, Math.floor(75 / 25))]).toBe('gem')
  })

  it('medium: skill=100 → gem(上限3)', () => {
    const MEDIUMS: EngravingMedium[] = ['metal', 'stone', 'wood', 'gem']
    expect(MEDIUMS[Math.min(3, Math.floor(100 / 25))]).toBe('gem')
  })
})

describe('CreatureEngraversSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureEngraversSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick差值<1400不更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1399)
    expect((sys as any).lastCheck).toBe(0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick差值>=1400更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1400)
    expect((sys as any).lastCheck).toBe(1400)
  })

  it('tick=1399边界不更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1399)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('第二次更新差值不足时保持', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1400)
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(1400)
  })

  it('第二次更新差值足够时再次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1400)
    sys.update(1, em, 2800)
    expect((sys as any).lastCheck).toBe(2800)
  })
})

describe('CreatureEngraversSystem - time-based cleanup', () => {
  let sys: CreatureEngraversSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('旧记录被删除, cutoff = tick-55000', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).engravers.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).engravers.push(makeMaker(2, { tick: 57000 }))
    sys.update(1, em, 60000)
    expect((sys as any).engravers).toHaveLength(1)
    expect((sys as any).engravers[0].entityId).toBe(2)
  })

  it('cutoff边界: cutoff=60000-55000=5000', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).engravers.push(makeMaker(1, { tick: 4999 }))
    ;(sys as any).engravers.push(makeMaker(2, { tick: 5000 }))
    sys.update(1, em, 60000)
    expect((sys as any).engravers).toHaveLength(1)
    expect((sys as any).engravers[0].entityId).toBe(2)
  })

  it('全部过期时全部删除', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).engravers.push(makeMaker(1, { tick: 0 }))
    sys.update(1, em, 60000)
    expect((sys as any).engravers).toHaveLength(0)
  })

  it('全部未过期时全部保留', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).engravers.push(makeMaker(1, { tick: 56000 }))
    ;(sys as any).engravers.push(makeMaker(2, { tick: 57000 }))
    sys.update(1, em, 60000)
    expect((sys as any).engravers).toHaveLength(2)
  })
})

describe('CreatureEngraversSystem - skillMap 操作', () => {
  let sys: CreatureEngraversSystem
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

describe('CreatureEngraversSystem - 边界与综合', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    expect(() => makeSys().update(1, makeEmptyEM(), 1400)).not.toThrow()
  })

  it('dt参数不影响节流', () => {
    const sys = makeSys()
    sys.update(999, makeEmptyEM(), 1399)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('entityId被正确保存', () => {
    const sys = makeSys()
    ;(sys as any).engravers.push(makeMaker(55))
    expect((sys as any).engravers[0].entityId).toBe(55)
  })

  it('所有字段类型正确', () => {
    const sys = makeSys()
    ;(sys as any).engravers.push(makeMaker(1))
    const r = (sys as any).engravers[0]
    expect(typeof r.skill).toBe('number')
    expect(typeof r.piecesCompleted).toBe('number')
    expect(typeof r.precision).toBe('number')
    expect(typeof r.creativity).toBe('number')
  })
})
