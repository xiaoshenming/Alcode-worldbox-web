import { describe, it, expect, beforeEach } from 'vitest'
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

describe('CreatureDyeingMakersSystem - 基础数据', () => {
  let sys: CreatureDyeingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无染色工', () => { expect((sys as any).makers).toHaveLength(0) })

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
  let sys: CreatureDyeingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('colorFastness公式: skill=40 → 12+40*0.75=42', () => {
    ;(sys as any).makers.push(makeMaker(1, { skill: 40, colorFastness: 12 + 40 * 0.75 }))
    expect((sys as any).makers[0].colorFastness).toBeCloseTo(42, 5)
  })

  it('colorFastness公式: skill=60 → 12+60*0.75=57', () => {
    const cf = 12 + 60 * 0.75
    ;(sys as any).makers.push(makeMaker(1, { skill: 60, colorFastness: cf }))
    expect((sys as any).makers[0].colorFastness).toBeCloseTo(57, 5)
  })

  it('reputation公式: skill=50 → 10+50*0.77=48.5', () => {
    const rep = 10 + 50 * 0.77
    ;(sys as any).makers.push(makeMaker(1, { skill: 50, reputation: rep }))
    expect((sys as any).makers[0].reputation).toBeCloseTo(48.5, 5)
  })

  it('reputation公式: skill=100 → 10+100*0.77=87', () => {
    const rep = 10 + 100 * 0.77
    ;(sys as any).makers.push(makeMaker(1, { skill: 100, reputation: rep }))
    expect((sys as any).makers[0].reputation).toBeCloseTo(87, 5)
  })

  it('batchesDyed: skill=42 → 4+floor(42/6)=4+7=11', () => {
    const b = 4 + Math.floor(42 / 6)
    ;(sys as any).makers.push(makeMaker(1, { skill: 42, batchesDyed: b }))
    expect((sys as any).makers[0].batchesDyed).toBe(11)
  })

  it('batchesDyed: skill=0 → 4+floor(0/6)=4', () => {
    ;(sys as any).makers.push(makeMaker(1, { skill: 0, batchesDyed: 4 }))
    expect((sys as any).makers[0].batchesDyed).toBe(4)
  })

  it('dyeingType: skill=10 → typeIdx=0 → vat_dyeing', () => {
    const TYPES: DyeingType[] = ['vat_dyeing', 'resist_dyeing', 'mordant_dyeing', 'direct_dyeing']
    const idx = Math.min(3, Math.floor(10 / 25))
    ;(sys as any).makers.push(makeMaker(1, { skill: 10, dyeingType: TYPES[idx] }))
    expect((sys as any).makers[0].dyeingType).toBe('vat_dyeing')
  })

  it('dyeingType: skill=25 → typeIdx=1 → resist_dyeing', () => {
    const TYPES: DyeingType[] = ['vat_dyeing', 'resist_dyeing', 'mordant_dyeing', 'direct_dyeing']
    const idx = Math.min(3, Math.floor(25 / 25))
    ;(sys as any).makers.push(makeMaker(1, { skill: 25, dyeingType: TYPES[idx] }))
    expect((sys as any).makers[0].dyeingType).toBe('resist_dyeing')
  })

  it('dyeingType: skill=50 → typeIdx=2 → mordant_dyeing', () => {
    const TYPES: DyeingType[] = ['vat_dyeing', 'resist_dyeing', 'mordant_dyeing', 'direct_dyeing']
    const idx = Math.min(3, Math.floor(50 / 25))
    ;(sys as any).makers.push(makeMaker(1, { skill: 50, dyeingType: TYPES[idx] }))
    expect((sys as any).makers[0].dyeingType).toBe('mordant_dyeing')
  })

  it('dyeingType: skill=75 → typeIdx=3 → direct_dyeing', () => {
    const TYPES: DyeingType[] = ['vat_dyeing', 'resist_dyeing', 'mordant_dyeing', 'direct_dyeing']
    const idx = Math.min(3, Math.floor(75 / 25))
    ;(sys as any).makers.push(makeMaker(1, { skill: 75, dyeingType: TYPES[idx] }))
    expect((sys as any).makers[0].dyeingType).toBe('direct_dyeing')
  })
})

describe('CreatureDyeingMakersSystem - CHECK_INTERVAL节流与cleanup', () => {
  let sys: CreatureDyeingMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick差值<1460不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1000)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=1460更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1460)
    expect((sys as any).lastCheck).toBe(1460)
  })

  it('cleanup: tick比cutoff(tick-48000)旧的记录被删除', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    // 当前tick=50000, cutoff=50000-48000=2000, tick=1000 < 2000 应被删除
    ;(sys as any).makers.push(makeMaker(1, { tick: 1000 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 40000 }))
    sys.update(1, em, 50000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('cleanup: tick等于cutoff边界时仍被删除', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    const currentTick = 50000
    const cutoff = currentTick - 48000  // 2000
    ;(sys as any).makers.push(makeMaker(1, { tick: cutoff - 1 }))  // 1999 < 2000, 删除
    ;(sys as any).makers.push(makeMaker(2, { tick: cutoff }))       // 2000, 不删除(tick < cutoff)
    sys.update(1, em, currentTick)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('skillMap未知实体返回undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('skillMap注入技能后可读取', () => {
    ;(sys as any).skillMap.set(42, 75)
    expect((sys as any).skillMap.get(42)).toBe(75)
  })
})
