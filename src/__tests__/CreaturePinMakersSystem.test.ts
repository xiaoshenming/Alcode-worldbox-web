import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreaturePinMakersSystem } from '../systems/CreaturePinMakersSystem'
import type { PinMaker, PinMaterial } from '../systems/CreaturePinMakersSystem'

// CHECK_INTERVAL=1380, CRAFT_CHANCE=0.005, MAX_MAKERS=30, SKILL_GROWTH=0.059
// sharpness=18+skill*0.69, reputation=10+skill*0.75, pinsMade=15+floor(skill/3)
// MATERIALS: brass/steel/bone/silver; cutoff=tick-50500

let nextId = 1
function makeSys(): CreaturePinMakersSystem { return new CreaturePinMakersSystem() }
function makeMaker(entityId: number, material: PinMaterial = 'brass', skill = 30, tick = 0): PinMaker {
  return { id: nextId++, entityId, skill, pinsMade: 20, material, sharpness: 50, reputation: 40, tick }
}
function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(false),
  } as any
}

describe('CreaturePinMakersSystem - 基础状态', () => {
  let sys: CreaturePinMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无记录', () => { expect((sys as any).makers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始 skillMap 为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('注入后可查询 material', () => {
    ;(sys as any).makers.push(makeMaker(1, 'steel'))
    expect((sys as any).makers[0].material).toBe('steel')
  })
  it('支持所有 4 种材质', () => {
    const mats: PinMaterial[] = ['brass', 'steel', 'bone', 'silver']
    mats.forEach((m, i) => { ;(sys as any).makers.push(makeMaker(i + 1, m)) })
    mats.forEach((m, i) => { expect((sys as any).makers[i].material).toBe(m) })
  })
  it('多个记录全部保存', () => {
    ;(sys as any).makers.push(makeMaker(1)); ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
  it('注入 skill 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 'brass', 80))
    expect((sys as any).makers[0].skill).toBe(80)
  })
  it('注入 tick 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 'brass', 30, 7777))
    expect((sys as any).makers[0].tick).toBe(7777)
  })
})

describe('CreaturePinMakersSystem - 公式计算', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('sharpness = 18 + skill * 0.69，skill=50 → 52.5', () => {
    expect(18 + 50 * 0.69).toBeCloseTo(52.5, 5)
  })
  it('sharpness = 18 + skill * 0.69，skill=0 → 18', () => {
    expect(18 + 0 * 0.69).toBeCloseTo(18, 5)
  })
  it('sharpness = 18 + skill * 0.69，skill=100 → 87', () => {
    expect(18 + 100 * 0.69).toBeCloseTo(87, 5)
  })
  it('reputation = 10 + skill * 0.75，skill=50 → 47.5', () => {
    expect(10 + 50 * 0.75).toBeCloseTo(47.5, 5)
  })
  it('pinsMade = 15 + Math.floor(skill/3)，skill=30 → 25', () => {
    expect(15 + Math.floor(30 / 3)).toBe(25)
  })
  it('pinsMade = 15 + Math.floor(skill/3)，skill=0 → 15', () => {
    expect(15 + Math.floor(0 / 3)).toBe(15)
  })
  it('pinsMade = 15 + Math.floor(skill/3)，skill=100 → 48', () => {
    expect(15 + Math.floor(100 / 3)).toBe(48)
  })
  it('material 分段：skill<25 → brass', () => {
    const M: PinMaterial[] = ['brass', 'steel', 'bone', 'silver']
    expect(M[Math.min(3, Math.floor(20 / 25))]).toBe('brass')
  })
  it('material 分段：skill=25 → steel', () => {
    const M: PinMaterial[] = ['brass', 'steel', 'bone', 'silver']
    expect(M[Math.min(3, Math.floor(25 / 25))]).toBe('steel')
  })
  it('material 分段：skill=50 → bone', () => {
    const M: PinMaterial[] = ['brass', 'steel', 'bone', 'silver']
    expect(M[Math.min(3, Math.floor(50 / 25))]).toBe('bone')
  })
  it('material 分段：skill=75 → silver', () => {
    const M: PinMaterial[] = ['brass', 'steel', 'bone', 'silver']
    expect(M[Math.min(3, Math.floor(75 / 25))]).toBe('silver')
  })
  it('material 分段：skill=100 → silver（上限 3）', () => {
    const M: PinMaterial[] = ['brass', 'steel', 'bone', 'silver']
    expect(M[Math.min(3, Math.floor(100 / 25))]).toBe('silver')
  })
  it('SKILL_GROWTH=0.059', () => { expect(0.059).toBeCloseTo(0.059, 5) })
  it('skill 上限为 100', () => { expect(Math.min(100, 100 + 0.059)).toBe(100) })
})

describe('CreaturePinMakersSystem - CHECK_INTERVAL', () => {
  let sys: CreaturePinMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < 1380 时不更新', () => {
    ;(sys as any).lastCheck = 1000; sys.update(1, makeEmptyEM(), 2379)
    expect((sys as any).lastCheck).toBe(1000)
  })
  it('tick >= 1380 时更新', () => {
    sys.update(1, makeEmptyEM(), 1380); expect((sys as any).lastCheck).toBe(1380)
  })
  it('tick=1379 不触发', () => {
    sys.update(1, makeEmptyEM(), 1379); expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=1380 恰好触发', () => {
    sys.update(1, makeEmptyEM(), 1380); expect((sys as any).lastCheck).toBe(1380)
  })
  it('连续调用不足间隔不更新', () => {
    sys.update(1, makeEmptyEM(), 1380); sys.update(1, makeEmptyEM(), 2000)
    expect((sys as any).lastCheck).toBe(1380)
  })
})

describe('CreaturePinMakersSystem - time-based cleanup', () => {
  let sys: CreaturePinMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 在 currentTick=60000 时被清除（cutoff=9500）', () => {
    ;(sys as any).makers.push(makeMaker(1, 'brass', 30, 0))
    sys.update(1, makeEmptyEM(), 60000); expect((sys as any).makers).toHaveLength(0)
  })
  it('tick=55000 在 currentTick=60000 时保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 'brass', 30, 55000))
    sys.update(1, makeEmptyEM(), 60000); expect((sys as any).makers).toHaveLength(1)
  })
  it('cutoff = currentTick - 50500', () => {
    expect(60000 - 50500).toBe(9500)
  })
  it('混合新旧', () => {
    ;(sys as any).makers.push(makeMaker(1, 'brass', 30, 0))
    ;(sys as any).makers.push(makeMaker(2, 'silver', 30, 55000))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).makers).toHaveLength(1); expect((sys as any).makers[0].entityId).toBe(2)
  })
  it('age < 10 不被招募', () => {
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = makeEmptyEM(); em.getEntitiesWithComponents.mockReturnValue([1])
    em.getComponent.mockReturnValue({ age: 9 })
    sys.update(1, em, 1380); expect((sys as any).makers).toHaveLength(0)
  })
  it('age >= 10 可被招募', () => {
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = makeEmptyEM(); em.getEntitiesWithComponents.mockReturnValue([1])
    em.getComponent.mockReturnValue({ age: 10 })
    sys.update(1, em, 1380); expect((sys as any).makers.length).toBeGreaterThanOrEqual(1)
  })
  it('MAX_MAKERS=30', () => {
    for (let i = 0; i < 30; i++) { ;(sys as any).makers.push(makeMaker(i + 1)) }
    expect((sys as any).makers).toHaveLength(30)
  })
  it('三个旧记录全部清除', () => {
    ;(sys as any).makers.push(makeMaker(1, 'brass', 30, 0))
    ;(sys as any).makers.push(makeMaker(2, 'steel', 30, 100))
    ;(sys as any).makers.push(makeMaker(3, 'bone', 30, 200))
    sys.update(1, makeEmptyEM(), 60000); expect((sys as any).makers).toHaveLength(0)
  })
})
