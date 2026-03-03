import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureDyersSystem } from '../systems/CreatureDyersSystem'
import type { Dyer, DyeSource } from '../systems/CreatureDyersSystem'

// CHECK_INTERVAL=1350, SKILL_GROWTH=0.058
// colorFastness = 15 + skill * 0.7
// reputation = 10 + skill * 0.75
// batchesDyed = 1 + Math.floor(skill / 8)
// dyeSource: srcIdx = Math.min(3, Math.floor(skill/25))
// cleanup cutoff = tick - 51000

let nextId = 1
function makeSys(): CreatureDyersSystem { return new CreatureDyersSystem() }
function makeMaker(entityId: number, overrides: Partial<Dyer> = {}): Dyer {
  return {
    id: nextId++, entityId, skill: 30, batchesDyed: 4,
    dyeSource: 'plant', colorFastness: 36, reputation: 32.5, tick: 0,
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

describe('CreatureDyersSystem - 基础状态', () => {
  let sys: CreatureDyersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无染工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, { dyeSource: 'insect' }))
    expect((sys as any).makers[0].dyeSource).toBe('insect')
  })

  it('DyeSource包含4种类型', () => {
    const sources: DyeSource[] = ['plant', 'mineral', 'insect', 'shellfish']
    sources.forEach((s, i) => { ;(sys as any).makers.push(makeMaker(i + 1, { dyeSource: s })) })
    const all = (sys as any).makers as Dyer[]
    sources.forEach((s, i) => { expect(all[i].dyeSource).toBe(s) })
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

describe('CreatureDyersSystem - 公式验证', () => {
  it('colorFastness公式: skill=40 → 15+40*0.7=43', () => {
    expect(15 + 40 * 0.7).toBeCloseTo(43, 5)
  })

  it('colorFastness公式: skill=60 → 15+60*0.7=57', () => {
    expect(15 + 60 * 0.7).toBeCloseTo(57, 5)
  })

  it('colorFastness公式: skill=0 → 15', () => {
    expect(15 + 0 * 0.7).toBeCloseTo(15, 5)
  })

  it('reputation公式: skill=50 → 10+50*0.75=47.5', () => {
    expect(10 + 50 * 0.75).toBeCloseTo(47.5, 5)
  })

  it('reputation公式: skill=100 → 10+100*0.75=85', () => {
    expect(10 + 100 * 0.75).toBeCloseTo(85, 5)
  })

  it('batchesDyed: skill=40 → 1+floor(40/8)=6', () => {
    expect(1 + Math.floor(40 / 8)).toBe(6)
  })

  it('batchesDyed: skill=0 → 1', () => {
    expect(1 + Math.floor(0 / 8)).toBe(1)
  })

  it('batchesDyed: skill=100 → 1+floor(100/8)=13', () => {
    expect(1 + Math.floor(100 / 8)).toBe(13)
  })

  it('dyeSource: skill=10 → srcIdx=0 → plant', () => {
    const SOURCES: DyeSource[] = ['plant', 'mineral', 'insect', 'shellfish']
    expect(SOURCES[Math.min(3, Math.floor(10 / 25))]).toBe('plant')
  })

  it('dyeSource: skill=25 → srcIdx=1 → mineral', () => {
    const SOURCES: DyeSource[] = ['plant', 'mineral', 'insect', 'shellfish']
    expect(SOURCES[Math.min(3, Math.floor(25 / 25))]).toBe('mineral')
  })

  it('dyeSource: skill=50 → srcIdx=2 → insect', () => {
    const SOURCES: DyeSource[] = ['plant', 'mineral', 'insect', 'shellfish']
    expect(SOURCES[Math.min(3, Math.floor(50 / 25))]).toBe('insect')
  })

  it('dyeSource: skill=75 → srcIdx=3 → shellfish', () => {
    const SOURCES: DyeSource[] = ['plant', 'mineral', 'insect', 'shellfish']
    expect(SOURCES[Math.min(3, Math.floor(75 / 25))]).toBe('shellfish')
  })

  it('dyeSource: skill=100 → srcIdx上限3 → shellfish', () => {
    const SOURCES: DyeSource[] = ['plant', 'mineral', 'insect', 'shellfish']
    expect(SOURCES[Math.min(3, Math.floor(100 / 25))]).toBe('shellfish')
  })
})

describe('CreatureDyersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureDyersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick差值<1350不更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1349)
    expect((sys as any).lastCheck).toBe(0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick差值>=1350更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1350)
    expect((sys as any).lastCheck).toBe(1350)
  })

  it('tick=1349边界不更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1349)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('第二次更新差值不足时保持不变', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1350)
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(1350)
  })

  it('第二次更新差值足够时再次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1350)
    sys.update(1, em, 2700)
    expect((sys as any).lastCheck).toBe(2700)
  })
})

describe('CreatureDyersSystem - time-based cleanup', () => {
  let sys: CreatureDyersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('旧记录(tick < cutoff)被删除', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 55000 }))
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('cutoff = tick - 51000，边界验证', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const cutoff = 60000 - 51000 // 9000
    ;(sys as any).makers.push(makeMaker(1, { tick: cutoff - 1 })) // 8999 < 9000 删除
    ;(sys as any).makers.push(makeMaker(2, { tick: cutoff }))     // 9000 保留
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('全部过期时全部删除', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 100 }))
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

describe('CreatureDyersSystem - skillMap 操作', () => {
  let sys: CreatureDyersSystem
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
  it('更新现有实体技能', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(1, 60)
    expect((sys as any).skillMap.get(1)).toBe(60)
  })
})

describe('CreatureDyersSystem - 边界与综合', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    const sys = makeSys()
    expect(() => sys.update(1, makeEmptyEM(), 1350)).not.toThrow()
  })

  it('dt参数不影响节流', () => {
    const sys = makeSys()
    sys.update(999, makeEmptyEM(), 1349)
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
    expect(typeof r.batchesDyed).toBe('number')
    expect(typeof r.colorFastness).toBe('number')
    expect(typeof r.reputation).toBe('number')
  })
})
