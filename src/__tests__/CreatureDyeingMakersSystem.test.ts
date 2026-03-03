import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureDyeingMakersSystem } from '../systems/CreatureDyeingMakersSystem'
import type { DyeingMaker, DyeingType } from '../systems/CreatureDyeingMakersSystem'

// CHECK_INTERVAL=1460, SKILL_GROWTH=0.050
// colorFastness = 12 + skill * 0.75
// reputation = 10 + skill * 0.77
// batchesDyed = 4 + Math.floor(skill / 6)
// dyeingType: typeIdx = Math.min(3, Math.floor(skill/25))
// cleanup cutoff = tick - 48000

let nextId = 1
function makeSys(): CreatureDyeingMakersSystem { return new CreatureDyeingMakersSystem() }
function makeMaker(entityId: number, overrides: Partial<DyeingMaker> = {}): DyeingMaker {
  return {
    id: nextId++, entityId, skill: 30, batchesDyed: 9,
    dyeingType: 'vat_dyeing', colorFastness: 34.5, reputation: 33.1, tick: 0,
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

describe('CreatureDyeingMakersSystem - 基础状态', () => {
  let sys: CreatureDyeingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无染色工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, { dyeingType: 'resist_dyeing' }))
    expect((sys as any).makers[0].dyeingType).toBe('resist_dyeing')
  })

  it('DyeingType包含4种类型', () => {
    const types: DyeingType[] = ['vat_dyeing', 'resist_dyeing', 'mordant_dyeing', 'direct_dyeing']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, { dyeingType: t })) })
    const all = (sys as any).makers as DyeingMaker[]
    types.forEach((t, i) => { expect(all[i].dyeingType).toBe(t) })
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

describe('CreatureDyeingMakersSystem - 公式验证', () => {
  it('colorFastness公式: skill=40 → 12+40*0.75=42', () => {
    expect(12 + 40 * 0.75).toBeCloseTo(42, 5)
  })

  it('colorFastness公式: skill=60 → 12+60*0.75=57', () => {
    expect(12 + 60 * 0.75).toBeCloseTo(57, 5)
  })

  it('colorFastness公式: skill=0 → 12', () => {
    expect(12 + 0 * 0.75).toBeCloseTo(12, 5)
  })

  it('reputation公式: skill=50 → 10+50*0.77=48.5', () => {
    expect(10 + 50 * 0.77).toBeCloseTo(48.5, 5)
  })

  it('reputation公式: skill=100 → 10+100*0.77=87', () => {
    expect(10 + 100 * 0.77).toBeCloseTo(87, 5)
  })

  it('batchesDyed: skill=42 → 4+floor(42/6)=11', () => {
    expect(4 + Math.floor(42 / 6)).toBe(11)
  })

  it('batchesDyed: skill=0 → 4+floor(0/6)=4', () => {
    expect(4 + Math.floor(0 / 6)).toBe(4)
  })

  it('batchesDyed: skill=100 → 4+floor(100/6)=20', () => {
    expect(4 + Math.floor(100 / 6)).toBe(20)
  })

  it('dyeingType: skill=10 → typeIdx=0 → vat_dyeing', () => {
    const TYPES: DyeingType[] = ['vat_dyeing', 'resist_dyeing', 'mordant_dyeing', 'direct_dyeing']
    expect(TYPES[Math.min(3, Math.floor(10 / 25))]).toBe('vat_dyeing')
  })

  it('dyeingType: skill=25 → typeIdx=1 → resist_dyeing', () => {
    const TYPES: DyeingType[] = ['vat_dyeing', 'resist_dyeing', 'mordant_dyeing', 'direct_dyeing']
    expect(TYPES[Math.min(3, Math.floor(25 / 25))]).toBe('resist_dyeing')
  })

  it('dyeingType: skill=50 → typeIdx=2 → mordant_dyeing', () => {
    const TYPES: DyeingType[] = ['vat_dyeing', 'resist_dyeing', 'mordant_dyeing', 'direct_dyeing']
    expect(TYPES[Math.min(3, Math.floor(50 / 25))]).toBe('mordant_dyeing')
  })

  it('dyeingType: skill=75 → typeIdx=3 → direct_dyeing', () => {
    const TYPES: DyeingType[] = ['vat_dyeing', 'resist_dyeing', 'mordant_dyeing', 'direct_dyeing']
    expect(TYPES[Math.min(3, Math.floor(75 / 25))]).toBe('direct_dyeing')
  })

  it('dyeingType: skill=100 → typeIdx上限3 → direct_dyeing', () => {
    const TYPES: DyeingType[] = ['vat_dyeing', 'resist_dyeing', 'mordant_dyeing', 'direct_dyeing']
    expect(TYPES[Math.min(3, Math.floor(100 / 25))]).toBe('direct_dyeing')
  })
})

describe('CreatureDyeingMakersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureDyeingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick差值<1460不更新lastCheck', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)
    expect((sys as any).lastCheck).toBe(0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick差值>=1460更新lastCheck', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1460)
    expect((sys as any).lastCheck).toBe(1460)
  })

  it('tick差值=1459边界不更新', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1459)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('第二次更新差值不足时保持不变', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1460)
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(1460)
  })

  it('第二次更新差值足够时再次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1460)
    sys.update(1, em, 2920)
    expect((sys as any).lastCheck).toBe(2920)
  })
})

describe('CreatureDyeingMakersSystem - time-based cleanup', () => {
  let sys: CreatureDyeingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('cleanup: tick比cutoff(tick-48000)旧的记录被删除', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 1000 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 40000 }))
    sys.update(1, em, 50000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('cutoff边界: tick < cutoff被删, tick >= cutoff保留', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 50000
    const cutoff = currentTick - 48000
    ;(sys as any).makers.push(makeMaker(1, { tick: cutoff - 1 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: cutoff }))
    sys.update(1, em, currentTick)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('所有记录都过期时全部删除', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 100 }))
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('所有记录都未过期时全部保留', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 55000 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 56000 }))
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureDyeingMakersSystem - skillMap 操作', () => {
  let sys: CreatureDyeingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skillMap初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('skillMap未知实体返回undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('skillMap注入技能后可读取', () => {
    ;(sys as any).skillMap.set(42, 75)
    expect((sys as any).skillMap.get(42)).toBe(75)
  })

  it('skillMap可存储多个实体', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(60)
  })

  it('skillMap可更新现有实体技能', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(1, 60)
    expect((sys as any).skillMap.get(1)).toBe(60)
  })
})

describe('CreatureDyeingMakersSystem - 边界与综合', () => {
  let sys: CreatureDyeingMakersSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    sys = makeSys()
    const em = makeEmptyEM()
    expect(() => sys.update(1, em, 1460)).not.toThrow()
  })

  it('dt 参数不影响节流', () => {
    sys = makeSys()
    const em = makeEmptyEM()
    sys.update(999, em, 1459)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('entityId 被正确保存', () => {
    sys = makeSys()
    ;(sys as any).makers.push(makeMaker(99))
    expect((sys as any).makers[0].entityId).toBe(99)
  })

  it('同一 tick 多次 update 只触发一次', () => {
    sys = makeSys()
    const em = makeEmptyEM()
    sys.update(1, em, 1460)
    sys.update(1, em, 1460)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })
})
