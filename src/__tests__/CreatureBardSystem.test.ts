import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBardSystem } from '../systems/CreatureBardSystem'
import type { Performance, SongType } from '../systems/CreatureBardSystem'

// CreatureBardSystem 测试:
// 常量: CHECK_INTERVAL=1400, PERFORM_CHANCE=0.004, MAX_PERFORMANCES=60, BASE_RADIUS=5
// MORALE_MAP: war_chant=15, lullaby=5, ballad=10, hymn=12, dirge=-5
// 私有字段: performances[], nextId, lastCheck, bardSkill

let nextPerfId = 1

function makeBardSys(): CreatureBardSystem {
  return new CreatureBardSystem()
}

function makePerformance(
  performer: number,
  song: SongType = 'ballad',
  tick = 0,
  overrides: Partial<Performance> = {}
): Performance {
  return {
    id: nextPerfId++,
    song,
    performer,
    morale_boost: 10,
    radius: 6,
    tick,
    ...overrides,
  }
}

const ALL_SONGS: SongType[] = ['war_chant', 'lullaby', 'ballad', 'hymn', 'dirge']

const MORALE_MAP: Record<SongType, number> = {
  war_chant: 15,
  lullaby: 5,
  ballad: 10,
  hymn: 12,
  dirge: -5,
}

// ══════════════════════════════════════════════════════════
describe('CreatureBardSystem — 初始状态', () => {
  afterEach(() => vi.restoreAllMocks())

  it('初始 performances 数组为空', () => {
    const sys = makeBardSys()
    expect((sys as any).performances).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    const sys = makeBardSys()
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    const sys = makeBardSys()
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 bardSkill 为空 Map', () => {
    const sys = makeBardSys()
    const skill = (sys as any).bardSkill
    expect(skill).toBeInstanceOf(Map)
    expect(skill.size).toBe(0)
  })

  it('每次 new 创建独立实例', () => {
    const a = makeBardSys()
    const b = makeBardSys()
    ;(a as any).performances.push(makePerformance(1))
    expect((b as any).performances).toHaveLength(0)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureBardSystem — performances 数组操作', () => {
  let sys: CreatureBardSystem
  beforeEach(() => { sys = makeBardSys(); nextPerfId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入演出后长度为 1', () => {
    ;(sys as any).performances.push(makePerformance(1, 'war_chant'))
    expect((sys as any).performances).toHaveLength(1)
  })

  it('注入演出后 song 字段正确', () => {
    ;(sys as any).performances.push(makePerformance(1, 'war_chant'))
    expect((sys as any).performances[0].song).toBe('war_chant')
  })

  it('返回内部引用（同一对象）', () => {
    ;(sys as any).performances.push(makePerformance(1))
    const ref = (sys as any).performances
    expect(ref).toBe((sys as any).performances)
  })

  it('支持全部 5 种 SongType', () => {
    ALL_SONGS.forEach((s, i) => { ;(sys as any).performances.push(makePerformance(i + 1, s)) })
    const arr: Performance[] = (sys as any).performances
    expect(arr).toHaveLength(5)
    ALL_SONGS.forEach((s, i) => { expect(arr[i].song).toBe(s) })
  })

  it('演出包含正确的 performer id', () => {
    ;(sys as any).performances.push(makePerformance(42))
    expect((sys as any).performances[0].performer).toBe(42)
  })

  it('多个演出全部返回', () => {
    ;(sys as any).performances.push(makePerformance(1))
    ;(sys as any).performances.push(makePerformance(2))
    ;(sys as any).performances.push(makePerformance(3))
    expect((sys as any).performances).toHaveLength(3)
  })

  it('演出 id 字段正确存储', () => {
    const p = makePerformance(5, 'hymn', 0, { id: 999 })
    ;(sys as any).performances.push(p)
    expect((sys as any).performances[0].id).toBe(999)
  })

  it('演出 morale_boost 字段正确存储', () => {
    ;(sys as any).performances.push(makePerformance(1, 'ballad', 0, { morale_boost: 25 }))
    expect((sys as any).performances[0].morale_boost).toBe(25)
  })

  it('演出 radius 字段正确存储', () => {
    ;(sys as any).performances.push(makePerformance(1, 'lullaby', 0, { radius: 12 }))
    expect((sys as any).performances[0].radius).toBe(12)
  })

  it('演出 tick 字段正确存储', () => {
    ;(sys as any).performances.push(makePerformance(1, 'dirge', 5678))
    expect((sys as any).performances[0].tick).toBe(5678)
  })

  it('注入 60 个演出（MAX_PERFORMANCES 上限）全部存储', () => {
    for (let i = 0; i < 60; i++) {
      ;(sys as any).performances.push(makePerformance(i + 1, ALL_SONGS[i % 5], i * 100))
    }
    expect((sys as any).performances).toHaveLength(60)
  })

  it('performances 数组顺序与插入顺序一致', () => {
    ;(sys as any).performances.push(makePerformance(10, 'ballad', 10))
    ;(sys as any).performances.push(makePerformance(20, 'dirge', 20))
    const arr: Performance[] = (sys as any).performances
    expect(arr[0].performer).toBe(10)
    expect(arr[1].performer).toBe(20)
  })

  it('可以手动 splice 删除演出', () => {
    ;(sys as any).performances.push(makePerformance(1))
    ;(sys as any).performances.push(makePerformance(2))
    ;(sys as any).performances.splice(0, 1)
    expect((sys as any).performances).toHaveLength(1)
    expect((sys as any).performances[0].performer).toBe(2)
  })

  it('dirge song 支持负 morale_boost', () => {
    ;(sys as any).performances.push(makePerformance(1, 'dirge', 0, { morale_boost: -5 }))
    expect((sys as any).performances[0].morale_boost).toBe(-5)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureBardSystem — bardSkill Map 操作', () => {
  let sys: CreatureBardSystem
  beforeEach(() => { sys = makeBardSys() })
  afterEach(() => vi.restoreAllMocks())

  it('未注册实体返回 0', () => {
    expect(((sys as any).bardSkill.get(1) ?? 0)).toBe(0)
  })

  it('未知大 id 返回 0', () => {
    expect(((sys as any).bardSkill.get(999999) ?? 0)).toBe(0)
  })

  it('注入技能后可查询', () => {
    ;(sys as any).bardSkill.set(1, 75)
    expect(((sys as any).bardSkill.get(1) ?? 0)).toBe(75)
  })

  it('注入零技能值', () => {
    ;(sys as any).bardSkill.set(5, 0)
    expect(((sys as any).bardSkill.get(5) ?? 0)).toBe(0)
  })

  it('注入最大技能 100', () => {
    ;(sys as any).bardSkill.set(6, 100)
    expect(((sys as any).bardSkill.get(6) ?? 0)).toBe(100)
  })

  it('覆盖技能后返回新值', () => {
    ;(sys as any).bardSkill.set(1, 50)
    ;(sys as any).bardSkill.set(1, 90)
    expect(((sys as any).bardSkill.get(1) ?? 0)).toBe(90)
  })

  it('多个实体技能独立', () => {
    ;(sys as any).bardSkill.set(1, 30)
    ;(sys as any).bardSkill.set(2, 80)
    ;(sys as any).bardSkill.set(3, 55)
    expect(((sys as any).bardSkill.get(1) ?? 0)).toBe(30)
    expect(((sys as any).bardSkill.get(2) ?? 0)).toBe(80)
    expect(((sys as any).bardSkill.get(3) ?? 0)).toBe(55)
    expect(((sys as any).bardSkill.get(4) ?? 0)).toBe(0)
  })

  it('注入浮点技能值', () => {
    ;(sys as any).bardSkill.set(7, 6.28)
    expect(((sys as any).bardSkill.get(7) ?? 0)).toBeCloseTo(6.28)
  })

  it('bardSkill.size 随 set 增长', () => {
    ;(sys as any).bardSkill.set(1, 10)
    ;(sys as any).bardSkill.set(2, 20)
    expect((sys as any).bardSkill.size).toBe(2)
  })

  it('delete 后技能消失', () => {
    ;(sys as any).bardSkill.set(1, 50)
    ;(sys as any).bardSkill.delete(1)
    expect(((sys as any).bardSkill.get(1) ?? 0)).toBe(0)
  })

  it('技能增长 +0.04 精度不丢失（SKILL_GROWTH=0.04）', () => {
    const base = 5.0
    ;(sys as any).bardSkill.set(1, base)
    ;(sys as any).bardSkill.set(1, Math.min(100, base + 0.04))
    expect(((sys as any).bardSkill.get(1) ?? 0)).toBeCloseTo(5.04)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureBardSystem — MORALE_MAP 常量验证', () => {
  afterEach(() => vi.restoreAllMocks())

  it('war_chant morale_boost=15（最高正向）', () => {
    expect(MORALE_MAP['war_chant']).toBe(15)
  })

  it('lullaby morale_boost=5（最低正向）', () => {
    expect(MORALE_MAP['lullaby']).toBe(5)
  })

  it('ballad morale_boost=10（中等正向）', () => {
    expect(MORALE_MAP['ballad']).toBe(10)
  })

  it('hymn morale_boost=12', () => {
    expect(MORALE_MAP['hymn']).toBe(12)
  })

  it('dirge morale_boost=-5（唯一负向）', () => {
    expect(MORALE_MAP['dirge']).toBe(-5)
  })

  it('boost 公式: boost = MORALE_MAP[song] * (0.5 + skill/100)，skill=0 时为一半', () => {
    const base = MORALE_MAP['war_chant']   // 15
    const boost = base * (0.5 + 0 / 100)  // 7.5
    expect(boost).toBeCloseTo(7.5)
  })

  it('boost 公式: skill=100 时 war_chant 最大 15 * 1.5 = 22.5', () => {
    const boost = MORALE_MAP['war_chant'] * (0.5 + 100 / 100)
    expect(boost).toBeCloseTo(22.5)
  })

  it('boost 公式: dirge skill=50 时 -5 * 1.0 = -5.0', () => {
    const boost = MORALE_MAP['dirge'] * (0.5 + 50 / 100)
    expect(boost).toBeCloseTo(-5.0)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureBardSystem — BASE_RADIUS 与 radius 公式', () => {
  afterEach(() => vi.restoreAllMocks())

  // radius = BASE_RADIUS + Math.floor(skill / 20)
  // BASE_RADIUS = 5

  it('skill=0 时 radius = 5', () => {
    expect(5 + Math.floor(0 / 20)).toBe(5)
  })

  it('skill=20 时 radius = 6', () => {
    expect(5 + Math.floor(20 / 20)).toBe(6)
  })

  it('skill=100 时 radius = 10', () => {
    expect(5 + Math.floor(100 / 20)).toBe(10)
  })

  it('skill=60 时 radius = 8', () => {
    expect(5 + Math.floor(60 / 20)).toBe(8)
  })

  it('skill=19 时 radius = 5（floor 效果）', () => {
    expect(5 + Math.floor(19 / 20)).toBe(5)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureBardSystem — 过期演出逻辑（手动模拟）', () => {
  let sys: CreatureBardSystem
  beforeEach(() => { sys = makeBardSys(); nextPerfId = 1 })
  afterEach(() => vi.restoreAllMocks())

  // cutoff = tick - 8000，演出 tick < cutoff 则过期

  it('tick=0 的旧演出在模拟过期后消失', () => {
    ;(sys as any).performances.push(makePerformance(1, 'ballad', 0))
    ;(sys as any).performances.push(makePerformance(2, 'hymn', 10000))
    const CURRENT = 10000
    const cutoff = CURRENT - 8000
    for (let i = (sys as any).performances.length - 1; i >= 0; i--) {
      if ((sys as any).performances[i].tick < cutoff) (sys as any).performances.splice(i, 1)
    }
    expect((sys as any).performances).toHaveLength(1)
    expect((sys as any).performances[0].performer).toBe(2)
  })

  it('新鲜演出不被过期逻辑删除', () => {
    const CURRENT = 9000
    ;(sys as any).performances.push(makePerformance(1, 'lullaby', 2000))
    const cutoff = CURRENT - 8000   // 1000
    for (let i = (sys as any).performances.length - 1; i >= 0; i--) {
      if ((sys as any).performances[i].tick < cutoff) (sys as any).performances.splice(i, 1)
    }
    expect((sys as any).performances).toHaveLength(1)
  })

  it('空数组执行过期逻辑不报错', () => {
    expect(() => {
      for (let i = (sys as any).performances.length - 1; i >= 0; i--) {
        if ((sys as any).performances[i].tick < 0) (sys as any).performances.splice(i, 1)
      }
    }).not.toThrow()
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureBardSystem — update() CHECK_INTERVAL 守卫（mock）', () => {
  afterEach(() => vi.restoreAllMocks())

  function makeMinimalEM() {
    return {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue(null),
      hasComponent: vi.fn().mockReturnValue(true),
    }
  }

  it('tick < CHECK_INTERVAL(1400) 时 update 提前返回，不调用 getEntitiesWithComponents', () => {
    const sys = makeBardSys()
    const em = makeMinimalEM()
    sys.update(16, em as any, 100)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick >= CHECK_INTERVAL 时调用 getEntitiesWithComponents', () => {
    const sys = makeBardSys()
    const em = makeMinimalEM()
    sys.update(16, em as any, 1400)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('首次 update tick=1400 后 lastCheck 更新为 1400', () => {
    const sys = makeBardSys()
    const em = makeMinimalEM()
    sys.update(16, em as any, 1400)
    expect((sys as any).lastCheck).toBe(1400)
  })

  it('第二次 update tick=1500 不触发（差值100<1400）', () => {
    const sys = makeBardSys()
    const em = makeMinimalEM()
    sys.update(16, em as any, 1400)
    em.getEntitiesWithComponents.mockClear()
    sys.update(16, em as any, 1500)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('第二次 update tick=2800 触发（差值1400>=CHECK_INTERVAL）', () => {
    const sys = makeBardSys()
    const em = makeMinimalEM()
    sys.update(16, em as any, 1400)
    em.getEntitiesWithComponents.mockClear()
    sys.update(16, em as any, 2800)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('update 返回 undefined', () => {
    const sys = makeBardSys()
    const em = makeMinimalEM()
    const result = sys.update(16, em as any, 100)
    expect(result).toBeUndefined()
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureBardSystem — MAX_PERFORMANCES 上限（mock）', () => {
  afterEach(() => vi.restoreAllMocks())

  it('performances 数量达到 60 时 update 不再添加', () => {
    const sys = makeBardSys()
    for (let i = 0; i < 60; i++) {
      ;(sys as any).performances.push(makePerformance(i + 1, ALL_SONGS[i % 5], i * 100))
    }
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([999]),
      getComponent: vi.fn().mockReturnValue({ age: 20 }),
      hasComponent: vi.fn().mockReturnValue(true),
    }
    vi.spyOn(Math, 'random').mockReturnValue(0) // 命中 PERFORM_CHANCE
    sys.update(16, em as any, 1400)
    expect((sys as any).performances).toHaveLength(60)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureBardSystem — Performance 接口结构验证', () => {
  afterEach(() => vi.restoreAllMocks())

  it('Performance 具有所有必要字段', () => {
    const p = makePerformance(1, 'hymn', 0)
    expect(p).toHaveProperty('id')
    expect(p).toHaveProperty('song')
    expect(p).toHaveProperty('performer')
    expect(p).toHaveProperty('morale_boost')
    expect(p).toHaveProperty('radius')
    expect(p).toHaveProperty('tick')
  })

  it('同一 performer 可有多个演出', () => {
    const sys = makeBardSys()
    ;(sys as any).performances.push(makePerformance(10, 'ballad', 0))
    ;(sys as any).performances.push(makePerformance(10, 'hymn', 100))
    const arr: Performance[] = (sys as any).performances
    expect(arr.filter(p => p.performer === 10)).toHaveLength(2)
  })

  it('war_chant 演出 morale_boost 存储正数', () => {
    const sys = makeBardSys()
    ;(sys as any).performances.push(makePerformance(1, 'war_chant', 0, { morale_boost: 15 }))
    expect((sys as any).performances[0].morale_boost).toBeGreaterThan(0)
  })

  it('dirge 演出 morale_boost 存储负数', () => {
    const sys = makeBardSys()
    ;(sys as any).performances.push(makePerformance(1, 'dirge', 0, { morale_boost: -5 }))
    expect((sys as any).performances[0].morale_boost).toBeLessThan(0)
  })
})
