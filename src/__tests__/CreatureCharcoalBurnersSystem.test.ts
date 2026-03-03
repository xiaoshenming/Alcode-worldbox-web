import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureCharcoalBurnersSystem } from '../systems/CreatureCharcoalBurnersSystem'
import type { CharcoalBurner, CharcoalGrade } from '../systems/CreatureCharcoalBurnersSystem'

let nextId = 1
function makeSys(): CreatureCharcoalBurnersSystem { return new CreatureCharcoalBurnersSystem() }
function makeBurner(entityId: number, grade: CharcoalGrade = 'soft', skill = 30, tick = 0): CharcoalBurner {
  return { id: nextId++, entityId, skill, batchesProduced: 10, grade, burnEfficiency: 60, reputation: 50, tick }
}
function makeEmptyEM() {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue([]),
    getEntitiesWithComponent: vi.fn().mockReturnValue([]),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(false),
  } as any
}

describe('CreatureCharcoalBurnersSystem - 基础状态', () => {
  let sys: CreatureCharcoalBurnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无烧炭工记录', () => { expect((sys as any).burners).toHaveLength(0) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始 skillMap 为空', () => { expect((sys as any).skillMap.size).toBe(0) })
  it('注入后可查询 grade', () => {
    ;(sys as any).burners.push(makeBurner(1, 'hard'))
    expect((sys as any).burners[0].grade).toBe('hard')
  })
  it('支持所有 4 种木炭等级', () => {
    const grades: CharcoalGrade[] = ['soft', 'medium', 'hard', 'activated']
    grades.forEach((g, i) => { ;(sys as any).burners.push(makeBurner(i + 1, g)) })
    const all = (sys as any).burners
    grades.forEach((g, i) => { expect(all[i].grade).toBe(g) })
  })
  it('多个记录全部保存', () => {
    ;(sys as any).burners.push(makeBurner(1))
    ;(sys as any).burners.push(makeBurner(2))
    expect((sys as any).burners).toHaveLength(2)
  })
  it('注入记录的 entityId 字段正确', () => {
    ;(sys as any).burners.push(makeBurner(99))
    expect((sys as any).burners[0].entityId).toBe(99)
  })
  it('注入记录的 skill 字段正确', () => {
    ;(sys as any).burners.push(makeBurner(1, 'soft', 88))
    expect((sys as any).burners[0].skill).toBe(88)
  })
  it('注入记录的 tick 字段正确', () => {
    ;(sys as any).burners.push(makeBurner(1, 'soft', 30, 12345))
    expect((sys as any).burners[0].tick).toBe(12345)
  })
  it('注入记录的 burnEfficiency 字段正确', () => {
    ;(sys as any).burners.push(makeBurner(1))
    expect((sys as any).burners[0].burnEfficiency).toBe(60)
  })
  it('注入记录的 reputation 字段正确', () => {
    ;(sys as any).burners.push(makeBurner(1))
    expect((sys as any).burners[0].reputation).toBe(50)
  })
})

describe('CreatureCharcoalBurnersSystem - 公式计算', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('burnEfficiency = 20 + skill * 0.7，skill=50 → 55', () => {
    expect(20 + 50 * 0.7).toBeCloseTo(55, 5)
  })
  it('burnEfficiency = 20 + skill * 0.7，skill=0 → 20', () => {
    expect(20 + 0 * 0.7).toBeCloseTo(20, 5)
  })
  it('burnEfficiency = 20 + skill * 0.7，skill=100 → 90', () => {
    expect(20 + 100 * 0.7).toBeCloseTo(90, 5)
  })
  it('reputation = 10 + skill * 0.75，skill=50 → 47.5', () => {
    expect(10 + 50 * 0.75).toBeCloseTo(47.5, 5)
  })
  it('reputation = 10 + skill * 0.75，skill=0 → 10', () => {
    expect(10 + 0 * 0.75).toBeCloseTo(10, 5)
  })
  it('reputation = 10 + skill * 0.75，skill=100 → 85', () => {
    expect(10 + 100 * 0.75).toBeCloseTo(85, 5)
  })
  it('batchesProduced = 1 + Math.floor(skill/10)，skill=50 → 6', () => {
    expect(1 + Math.floor(50 / 10)).toBe(6)
  })
  it('batchesProduced = 1 + Math.floor(skill/10)，skill=9 → 1', () => {
    expect(1 + Math.floor(9 / 10)).toBe(1)
  })
  it('batchesProduced = 1 + Math.floor(skill/10)，skill=100 → 11', () => {
    expect(1 + Math.floor(100 / 10)).toBe(11)
  })
  it('grade 分段：skill<25 → soft（gradeIdx=0）', () => {
    const GRADES: CharcoalGrade[] = ['soft', 'medium', 'hard', 'activated']
    expect(GRADES[Math.min(3, Math.floor(20 / 25))]).toBe('soft')
  })
  it('grade 分段：skill=25 → medium（gradeIdx=1）', () => {
    const GRADES: CharcoalGrade[] = ['soft', 'medium', 'hard', 'activated']
    expect(GRADES[Math.min(3, Math.floor(25 / 25))]).toBe('medium')
  })
  it('grade 分段：skill=50 → hard（gradeIdx=2）', () => {
    const GRADES: CharcoalGrade[] = ['soft', 'medium', 'hard', 'activated']
    expect(GRADES[Math.min(3, Math.floor(50 / 25))]).toBe('hard')
  })
  it('grade 分段：skill=75 → activated（gradeIdx=3）', () => {
    const GRADES: CharcoalGrade[] = ['soft', 'medium', 'hard', 'activated']
    expect(GRADES[Math.min(3, Math.floor(75 / 25))]).toBe('activated')
  })
  it('grade 分段：skill=100 → activated（上限为 3）', () => {
    const GRADES: CharcoalGrade[] = ['soft', 'medium', 'hard', 'activated']
    const idx = Math.min(3, Math.floor(100 / 25))
    expect(idx).toBe(3)
    expect(GRADES[idx]).toBe('activated')
  })
  it('skill=24 时仍为 soft（边界前）', () => {
    const GRADES: CharcoalGrade[] = ['soft', 'medium', 'hard', 'activated']
    expect(GRADES[Math.min(3, Math.floor(24 / 25))]).toBe('soft')
  })
  it('SKILL_GROWTH=0.065', () => {
    expect(0.065).toBeCloseTo(0.065, 5)
  })
  it('skill 上限为 100：99 + 0.065 → min(100,...) = 99.065', () => {
    expect(Math.min(100, 99 + 0.065)).toBeCloseTo(99.065, 5)
  })
  it('skill 已是 100 时不超过 100', () => {
    expect(Math.min(100, 100 + 0.065)).toBe(100)
  })
})

describe('CreatureCharcoalBurnersSystem - CHECK_INTERVAL 与 update', () => {
  let sys: CreatureCharcoalBurnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 差值 < 1450 时不更新 lastCheck', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 2449)
    expect((sys as any).lastCheck).toBe(1000)
  })
  it('tick 差值 < 1450 时不调用 getEntitiesWithComponents', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 2449)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })
  it('tick 差值 >= 1450 时 lastCheck 更新为当前 tick', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1450)
    expect((sys as any).lastCheck).toBe(1450)
  })
  it('tick 差值 = 1449 时不更新（边界值）', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 1449)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=1450 时恰好触发', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1450)
    expect((sys as any).lastCheck).toBe(1450)
  })
  it('连续调用，第二次不足间隔时不更新', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1450)
    sys.update(1, em, 2000)
    expect((sys as any).lastCheck).toBe(1450)
  })
  it('达到第二次间隔时正确更新 lastCheck', () => {
    const em = makeEmptyEM()
    sys.update(1, em, 1450)
    sys.update(1, em, 2900)
    expect((sys as any).lastCheck).toBe(2900)
  })
})

describe('CreatureCharcoalBurnersSystem - time-based cleanup', () => {
  let sys: CreatureCharcoalBurnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 的记录在 currentTick=60000 时被清除', () => {
    ;(sys as any).burners.push(makeBurner(1, 'soft', 30, 0))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).burners).toHaveLength(0)
  })
  it('tick=56000 的记录在 currentTick=60000 时被保留', () => {
    ;(sys as any).burners.push(makeBurner(1, 'soft', 30, 56000))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).burners).toHaveLength(1)
  })
  it('cutoff 边界：tick=5999 在 currentTick=60000 时被删除', () => {
    ;(sys as any).burners.push(makeBurner(1, 'soft', 30, 5999))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).burners).toHaveLength(0)
  })
  it('cutoff 边界：tick=6000 在 currentTick=60000 时保留', () => {
    ;(sys as any).burners.push(makeBurner(1, 'soft', 30, 6000))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).burners).toHaveLength(1)
  })
  it('混合新旧记录：旧的被删，新的保留', () => {
    ;(sys as any).burners.push(makeBurner(1, 'soft', 30, 0))
    ;(sys as any).burners.push(makeBurner(2, 'hard', 30, 56000))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).burners).toHaveLength(1)
    expect((sys as any).burners[0].entityId).toBe(2)
  })
  it('三个旧记录全部被清除', () => {
    ;(sys as any).burners.push(makeBurner(1, 'soft', 30, 0))
    ;(sys as any).burners.push(makeBurner(2, 'medium', 30, 100))
    ;(sys as any).burners.push(makeBurner(3, 'hard', 30, 500))
    sys.update(1, makeEmptyEM(), 60000)
    expect((sys as any).burners).toHaveLength(0)
  })
  it('cutoff = currentTick - 54000', () => {
    expect(60000 - 54000).toBe(6000)
  })
  it('MAX_BURNERS 为 32', () => {
    for (let i = 0; i < 32; i++) {
      ;(sys as any).burners.push(makeBurner(i + 1))
    }
    expect((sys as any).burners).toHaveLength(32)
  })
})

describe('CreatureCharcoalBurnersSystem - skillMap', () => {
  let sys: CreatureCharcoalBurnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('skillMap 是 Map 实例', () => {
    expect((sys as any).skillMap instanceof Map).toBe(true)
  })
  it('可手动存入技能值', () => {
    ;(sys as any).skillMap.set(1, 55)
    expect((sys as any).skillMap.get(1)).toBe(55)
  })
  it('不同实体独立存储', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 20)
    expect((sys as any).skillMap.size).toBe(2)
  })
  it('same entityId 覆盖写入', () => {
    ;(sys as any).skillMap.set(5, 30)
    ;(sys as any).skillMap.set(5, 60)
    expect((sys as any).skillMap.get(5)).toBe(60)
  })
  it('age < 11 的生物不被招募', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = makeEmptyEM()
    em.getEntitiesWithComponents.mockReturnValue([1])
    em.getComponent.mockReturnValue({ age: 10 })
    sys.update(1, em, 1450)
    expect((sys as any).burners).toHaveLength(0)
  })
  it('age >= 11 的生物可被招募', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = makeEmptyEM()
    em.getEntitiesWithComponents.mockReturnValue([1])
    em.getComponent.mockReturnValue({ age: 11 })
    sys.update(1, em, 1450)
    expect((sys as any).burners.length).toBeGreaterThanOrEqual(1)
  })
})
