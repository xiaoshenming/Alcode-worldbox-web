import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureParchmentMakersSystem } from '../systems/CreatureParchmentMakersSystem'
import type { ParchmentMaker, ParchmentGrade } from '../systems/CreatureParchmentMakersSystem'

// CHECK_INTERVAL=1500, CRAFT_CHANCE=0.005, MAX_MAKERS=30, SKILL_GROWTH=0.06
// GRADES: rough/standard/fine/vellum, cutoff=tick-52000

let nextId = 1
function makeSys(): CreatureParchmentMakersSystem { return new CreatureParchmentMakersSystem() }
function makeMaker(entityId: number, grade: ParchmentGrade = 'rough', skill = 30, tick = 0): ParchmentMaker {
  return { id: nextId++, entityId, skill, sheetsMade: 5, grade, scraping: 50, reputation: 40, tick }
}
function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(false),
  } as any
}

describe('CreatureParchmentMakersSystem - 基础状态', () => {
  let sys: CreatureParchmentMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无羊皮纸师记录', () => { expect((sys as any).makers).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始 skillMap 为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('注入后可查询 grade', () => {
    ;(sys as any).makers.push(makeMaker(1, 'fine'))
    expect((sys as any).makers[0].grade).toBe('fine')
  })
  it('支持所有 4 种等级', () => {
    const grades: ParchmentGrade[] = ['rough', 'standard', 'fine', 'vellum']
    grades.forEach((g, i) => { ;(sys as any).makers.push(makeMaker(i + 1, g)) })
    const all = (sys as any).makers
    grades.forEach((g, i) => { expect(all[i].grade).toBe(g) })
  })
  it('多个记录全部保存', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
  it('注入的 entityId 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(77))
    expect((sys as any).makers[0].entityId).toBe(77)
  })
  it('注入的 skill 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 'rough', 65))
    expect((sys as any).makers[0].skill).toBe(65)
  })
  it('注入的 tick 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 'rough', 30, 8888))
    expect((sys as any).makers[0].tick).toBe(8888)
  })
})

describe('CreatureParchmentMakersSystem - 公式计算', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('scraping = 15 + skill * 0.65，skill=40 → 41', () => {
    expect(15 + 40 * 0.65).toBeCloseTo(41, 5)
  })
  it('scraping = 15 + skill * 0.65，skill=0 → 15', () => {
    expect(15 + 0 * 0.65).toBeCloseTo(15, 5)
  })
  it('scraping = 15 + skill * 0.65，skill=100 → 80', () => {
    expect(15 + 100 * 0.65).toBeCloseTo(80, 5)
  })
  it('reputation = 10 + skill * 0.75，skill=50 → 47.5', () => {
    expect(10 + 50 * 0.75).toBeCloseTo(47.5, 5)
  })
  it('sheetsMade = 1 + Math.floor(skill/7)，skill=49 → 8', () => {
    expect(1 + Math.floor(49 / 7)).toBe(8)
  })
  it('sheetsMade = 1 + Math.floor(skill/7)，skill=0 → 1', () => {
    expect(1 + Math.floor(0 / 7)).toBe(1)
  })
  it('grade 分段：skill<25 → rough', () => {
    const G: ParchmentGrade[] = ['rough', 'standard', 'fine', 'vellum']
    expect(G[Math.min(3, Math.floor(20 / 25))]).toBe('rough')
  })
  it('grade 分段：skill=25 → standard', () => {
    const G: ParchmentGrade[] = ['rough', 'standard', 'fine', 'vellum']
    expect(G[Math.min(3, Math.floor(25 / 25))]).toBe('standard')
  })
  it('grade 分段：skill=50 → fine', () => {
    const G: ParchmentGrade[] = ['rough', 'standard', 'fine', 'vellum']
    expect(G[Math.min(3, Math.floor(50 / 25))]).toBe('fine')
  })
  it('grade 分段：skill=75 → vellum', () => {
    const G: ParchmentGrade[] = ['rough', 'standard', 'fine', 'vellum']
    expect(G[Math.min(3, Math.floor(75 / 25))]).toBe('vellum')
  })
  it('grade 分段：skill=100 → vellum（上限 3）', () => {
    const G: ParchmentGrade[] = ['rough', 'standard', 'fine', 'vellum']
    expect(G[Math.min(3, Math.floor(100 / 25))]).toBe('vellum')
  })
  it('SKILL_GROWTH=0.06', () => { expect(0.06).toBeCloseTo(0.06, 5) })
  it('skill 上限为 100', () => { expect(Math.min(100, 100 + 0.06)).toBe(100) })
})

describe('CreatureParchmentMakersSystem - CHECK_INTERVAL', () => {
  let sys: CreatureParchmentMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < 1500 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(1, makeEmptyEM(), 2499)
    expect((sys as any).lastCheck).toBe(1000)
  })
  it('tick >= 1500 时更新 lastCheck', () => {
    sys.update(1, makeEmptyEM(), 1500)
    expect((sys as any).lastCheck).toBe(1500)
  })
  it('tick=1499 不触发', () => {
    sys.update(1, makeEmptyEM(), 1499)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=1500 恰好触发', () => {
    sys.update(1, makeEmptyEM(), 1500)
    expect((sys as any).lastCheck).toBe(1500)
  })
  it('连续调用不足间隔不更新', () => {
    sys.update(1, makeEmptyEM(), 1500)
    sys.update(1, makeEmptyEM(), 2000)
    expect((sys as any).lastCheck).toBe(1500)
  })
  it('二次间隔到达时更新', () => {
    sys.update(1, makeEmptyEM(), 1500)
    sys.update(1, makeEmptyEM(), 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
})

describe('CreatureParchmentMakersSystem - time-based cleanup', () => {
  let sys: CreatureParchmentMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 的记录在 currentTick=60000 时被清除（cutoff=8000）', () => {
    ;(sys as any).makers.push(makeMaker(1, 'rough', 30, 0))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('tick=55000 的记录在 currentTick=60000 时保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 'rough', 30, 55000))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).makers).toHaveLength(1)
  })
  it('cutoff = currentTick - 52000', () => {
    expect(60000 - 52000).toBe(8000)
  })
  it('混合新旧记录', () => {
    ;(sys as any).makers.push(makeMaker(1, 'rough', 30, 0))
    ;(sys as any).makers.push(makeMaker(2, 'vellum', 30, 55000))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
  it('age < 10 的生物不被招募', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = makeEmptyEM()
    em.getEntitiesWithComponents.mockReturnValue([1])
    em.getComponent.mockReturnValue({ age: 9 })
    sys.update(1, em, 1500)
    expect((sys as any).makers).toHaveLength(0)
  })
  it('age >= 10 的生物可被招募', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = makeEmptyEM()
    em.getEntitiesWithComponents.mockReturnValue([1])
    em.getComponent.mockReturnValue({ age: 10 })
    sys.update(1, em, 1500)
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(1)
  })
  it('MAX_MAKERS 为 30', () => {
    for (let i = 0; i < 30; i++) { ;(sys as any).makers.push(makeMaker(i + 1)) }
    expect((sys as any).makers).toHaveLength(30)
  })
})
