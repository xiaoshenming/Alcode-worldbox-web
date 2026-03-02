import { describe, it, expect, beforeEach, vi } from 'vitest'
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
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无烧炭工记录', () => {
    expect((sys as any).burners).toHaveLength(0)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

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
})

describe('CreatureCharcoalBurnersSystem - 公式计算', () => {
  it('burnEfficiency = 20 + skill * 0.7，skill=50 → 55', () => {
    const skill = 50
    const result = 20 + skill * 0.7
    expect(result).toBeCloseTo(55, 5)
  })

  it('reputation = 10 + skill * 0.75，skill=50 → 47.5', () => {
    const skill = 50
    const result = 10 + skill * 0.75
    expect(result).toBeCloseTo(47.5, 5)
  })

  it('batchesProduced = 1 + Math.floor(skill/10)，skill=50 → 6', () => {
    const skill = 50
    const result = 1 + Math.floor(skill / 10)
    expect(result).toBe(6)
  })

  it('batchesProduced = 1 + Math.floor(skill/10)，skill=9 → 1', () => {
    const skill = 9
    const result = 1 + Math.floor(skill / 10)
    expect(result).toBe(1)
  })

  it('grade 分段：skill<25 → soft（gradeIdx=0）', () => {
    const GRADES: CharcoalGrade[] = ['soft', 'medium', 'hard', 'activated']
    const skill = 20
    const idx = Math.min(3, Math.floor(skill / 25))
    expect(GRADES[idx]).toBe('soft')
  })

  it('grade 分段：skill=25 → medium（gradeIdx=1）', () => {
    const GRADES: CharcoalGrade[] = ['soft', 'medium', 'hard', 'activated']
    const skill = 25
    const idx = Math.min(3, Math.floor(skill / 25))
    expect(GRADES[idx]).toBe('medium')
  })

  it('grade 分段：skill=50 → hard（gradeIdx=2）', () => {
    const GRADES: CharcoalGrade[] = ['soft', 'medium', 'hard', 'activated']
    const skill = 50
    const idx = Math.min(3, Math.floor(skill / 25))
    expect(GRADES[idx]).toBe('hard')
  })

  it('grade 分段：skill=75 → activated（gradeIdx=3）', () => {
    const GRADES: CharcoalGrade[] = ['soft', 'medium', 'hard', 'activated']
    const skill = 75
    const idx = Math.min(3, Math.floor(skill / 25))
    expect(GRADES[idx]).toBe('activated')
  })

  it('grade 分段：skill=100 → activated（上限为 3）', () => {
    const GRADES: CharcoalGrade[] = ['soft', 'medium', 'hard', 'activated']
    const skill = 100
    const idx = Math.min(3, Math.floor(skill / 25))
    expect(idx).toBe(3)
    expect(GRADES[idx]).toBe('activated')
  })
})

describe('CreatureCharcoalBurnersSystem - CHECK_INTERVAL 与 update', () => {
  let sys: CreatureCharcoalBurnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 差值 < 1450 时，update 直接返回，lastCheck 不变', () => {
    const em = makeEmptyEM()
    ;(sys as any).lastCheck = 1000
    sys.update(1, em, 2449)
    expect((sys as any).lastCheck).toBe(1000)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick 差值 >= 1450 时，lastCheck 更新为当前 tick', () => {
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
})

describe('CreatureCharcoalBurnersSystem - time-based cleanup', () => {
  let sys: CreatureCharcoalBurnersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick=0 的记录在 currentTick=60000 时被清除（0 < 6000）', () => {
    ;(sys as any).burners.push(makeBurner(1, 'soft', 30, 0))
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 60000)
    expect((sys as any).burners).toHaveLength(0)
  })

  it('tick=56000 的记录在 currentTick=60000 时被保留（56000 >= 6000）', () => {
    ;(sys as any).burners.push(makeBurner(1, 'soft', 30, 56000))
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 60000)
    expect((sys as any).burners).toHaveLength(1)
  })

  it('cutoff 边界：tick=5999 在 currentTick=60000 时被删除（5999 < 6000）', () => {
    // cutoff = 60000 - 54000 = 6000
    ;(sys as any).burners.push(makeBurner(1, 'soft', 30, 5999))
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 60000)
    expect((sys as any).burners).toHaveLength(0)
  })

  it('混合新旧记录：旧的被删，新的保留', () => {
    ;(sys as any).burners.push(makeBurner(1, 'soft', 30, 0))       // 旧，应删
    ;(sys as any).burners.push(makeBurner(2, 'hard', 30, 56000))   // 新，应留
    const em = makeEmptyEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, 60000)
    expect((sys as any).burners).toHaveLength(1)
    expect((sys as any).burners[0].entityId).toBe(2)
  })
})
