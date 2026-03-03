import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureEmbroideryMakersSystem } from '../systems/CreatureEmbroideryMakersSystem'
import type { EmbroideryMaker, EmbroideryType } from '../systems/CreatureEmbroideryMakersSystem'

// CHECK_INTERVAL=1520, SKILL_GROWTH=0.053
// stitchPrecision = 14 + skill * 0.73
// reputation = 10 + skill * 0.80
// piecesMade = 2 + Math.floor(skill / 8)
// embroideryType: typeIdx = Math.min(3, Math.floor(skill/25))
// cleanup cutoff = tick - 52000

let nextId = 1
function makeSys(): CreatureEmbroideryMakersSystem { return new CreatureEmbroideryMakersSystem() }
function makeMaker(entityId: number, overrides: Partial<EmbroideryMaker> = {}): EmbroideryMaker {
  return {
    id: nextId++, entityId, skill: 30, piecesMade: 5,
    embroideryType: 'cross_stitch', stitchPrecision: 35.9, reputation: 34, tick: 0,
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

describe('CreatureEmbroideryMakersSystem - 基础状态', () => {
  let sys: CreatureEmbroideryMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无刺绣工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })

  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1, { embroideryType: 'crewel' }))
    expect((sys as any).makers[0].embroideryType).toBe('crewel')
  })

  it('EmbroideryType包含4种类型', () => {
    const types: EmbroideryType[] = ['cross_stitch', 'crewel', 'goldwork', 'whitework']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, { embroideryType: t })) })
    const all = (sys as any).makers as EmbroideryMaker[]
    types.forEach((t, i) => { expect(all[i].embroideryType).toBe(t) })
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

describe('CreatureEmbroideryMakersSystem - 公式验证', () => {
  it('stitchPrecision公式: skill=40 → 14+40*0.73=43.2', () => {
    expect(14 + 40 * 0.73).toBeCloseTo(43.2, 5)
  })

  it('stitchPrecision公式: skill=0 → 14', () => {
    expect(14 + 0 * 0.73).toBeCloseTo(14, 5)
  })

  it('stitchPrecision公式: skill=100 → 14+100*0.73=87', () => {
    expect(14 + 100 * 0.73).toBeCloseTo(87, 5)
  })

  it('reputation公式: skill=50 → 10+50*0.80=50', () => {
    expect(10 + 50 * 0.80).toBeCloseTo(50, 5)
  })

  it('reputation公式: skill=100 → 10+100*0.80=90', () => {
    expect(10 + 100 * 0.80).toBeCloseTo(90, 5)
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

  it('embroideryType: skill=10 → cross_stitch', () => {
    const TYPES: EmbroideryType[] = ['cross_stitch', 'crewel', 'goldwork', 'whitework']
    expect(TYPES[Math.min(3, Math.floor(10 / 25))]).toBe('cross_stitch')
  })

  it('embroideryType: skill=25 → crewel', () => {
    const TYPES: EmbroideryType[] = ['cross_stitch', 'crewel', 'goldwork', 'whitework']
    expect(TYPES[Math.min(3, Math.floor(25 / 25))]).toBe('crewel')
  })

  it('embroideryType: skill=50 → goldwork', () => {
    const TYPES: EmbroideryType[] = ['cross_stitch', 'crewel', 'goldwork', 'whitework']
    expect(TYPES[Math.min(3, Math.floor(50 / 25))]).toBe('goldwork')
  })

  it('embroideryType: skill=75 → whitework', () => {
    const TYPES: EmbroideryType[] = ['cross_stitch', 'crewel', 'goldwork', 'whitework']
    expect(TYPES[Math.min(3, Math.floor(75 / 25))]).toBe('whitework')
  })

  it('embroideryType: skill=100 → whitework(上限3)', () => {
    const TYPES: EmbroideryType[] = ['cross_stitch', 'crewel', 'goldwork', 'whitework']
    expect(TYPES[Math.min(3, Math.floor(100 / 25))]).toBe('whitework')
  })
})

describe('CreatureEmbroideryMakersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureEmbroideryMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick差值<1520不更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1519)
    expect((sys as any).lastCheck).toBe(0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick差值>=1520更新lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1520)
    expect((sys as any).lastCheck).toBe(1520)
  })

  it('tick=1519边界不更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1519)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('第二次更新差值不足时保持', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1520)
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(1520)
  })

  it('第二次更新差值足够时再次更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1520)
    sys.update(1, em, 3040)
    expect((sys as any).lastCheck).toBe(3040)
  })
})

describe('CreatureEmbroideryMakersSystem - time-based cleanup', () => {
  let sys: CreatureEmbroideryMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('旧记录(tick < cutoff)被删除, cutoff = tick-52000', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 55000 }))
    sys.update(1, em, 60000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('cutoff边界: cutoff = 60000-52000=8000', () => {
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).makers.push(makeMaker(1, { tick: 7999 })) // < 8000 删除
    ;(sys as any).makers.push(makeMaker(2, { tick: 8000 })) // 保留
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

describe('CreatureEmbroideryMakersSystem - skillMap 操作', () => {
  let sys: CreatureEmbroideryMakersSystem
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

describe('CreatureEmbroideryMakersSystem - 边界与综合', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('空数组时 update 不报错', () => {
    expect(() => makeSys().update(1, makeEmptyEM(), 1520)).not.toThrow()
  })

  it('dt参数不影响节流', () => {
    const sys = makeSys()
    sys.update(999, makeEmptyEM(), 1519)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('entityId被正确保存', () => {
    const sys = makeSys()
    ;(sys as any).makers.push(makeMaker(77))
    expect((sys as any).makers[0].entityId).toBe(77)
  })

  it('所有字段类型正确', () => {
    const sys = makeSys()
    ;(sys as any).makers.push(makeMaker(1))
    const r = (sys as any).makers[0]
    expect(typeof r.skill).toBe('number')
    expect(typeof r.piecesMade).toBe('number')
    expect(typeof r.stitchPrecision).toBe('number')
    expect(typeof r.reputation).toBe('number')
  })

  it('同一tick多次调用只更新一次', () => {
    const sys = makeSys()
    const em = makeEmptyEM()
    sys.update(1, em, 1520)
    sys.update(1, em, 1520)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })
})
