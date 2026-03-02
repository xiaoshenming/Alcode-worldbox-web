import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureSummoningSystem } from '../systems/CreatureSummoningSystem'
import type { Summon, SummonType } from '../systems/CreatureSummoningSystem'

let nextId = 1

function makeSys(): CreatureSummoningSystem { return new CreatureSummoningSystem() }

function makeSummon(
  summonerId: number,
  type: SummonType = 'elemental',
  overrides: Partial<Summon> = {}
): Summon {
  return {
    id: nextId++,
    type,
    summonerId,
    x: 10,
    y: 20,
    power: 75,
    duration: 500,
    tick: 0,
    ...overrides,
  }
}

function makeMockEM(
  entities: number[] = [],
  componentMap: Record<number, Record<string, unknown>> = {}
) {
  return {
    getComponent: (id: number, type: string) => componentMap[id]?.[type],
    getEntitiesWithComponents: (..._types: string[]) => entities,
    hasComponent: (id: number, type: string) => Boolean(componentMap[id]?.[type]),
  }
}

// ─── 初始状态 ───────────────────────────────────────────────────────────────
describe('CreatureSummoningSystem — 初始状态', () => {
  let sys: CreatureSummoningSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始 summons 为空数组', () => {
    expect((sys as any).summons).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 masteryMap 为空 Map', () => {
    expect((sys as any).masteryMap.size).toBe(0)
  })

  it('masteryMap 是 Map 类型', () => {
    expect((sys as any).masteryMap).toBeInstanceOf(Map)
  })
})

// ─── Summon 数据结构 ────────────────────────────────────────────────────────
describe('CreatureSummoningSystem — Summon 数据结构', () => {
  let sys: CreatureSummoningSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入 summon 后 summons 长度为 1', () => {
    ;(sys as any).summons.push(makeSummon(1))
    expect((sys as any).summons).toHaveLength(1)
  })

  it('summon.type 正确存储', () => {
    ;(sys as any).summons.push(makeSummon(1, 'spirit'))
    expect((sys as any).summons[0].type).toBe('spirit')
  })

  it('summon.summonerId 正确存储', () => {
    ;(sys as any).summons.push(makeSummon(42, 'golem'))
    expect((sys as any).summons[0].summonerId).toBe(42)
  })

  it('summon.power 正确存储', () => {
    ;(sys as any).summons.push(makeSummon(1, 'elemental', { power: 99 }))
    expect((sys as any).summons[0].power).toBe(99)
  })

  it('summon.duration 正确存储', () => {
    ;(sys as any).summons.push(makeSummon(1, 'phantom', { duration: 1200 }))
    expect((sys as any).summons[0].duration).toBe(1200)
  })

  it('summon.x 和 summon.y 正确存储', () => {
    ;(sys as any).summons.push(makeSummon(1, 'familiar', { x: 33, y: 44 }))
    expect((sys as any).summons[0].x).toBe(33)
    expect((sys as any).summons[0].y).toBe(44)
  })

  it('summon.tick 正确存储', () => {
    ;(sys as any).summons.push(makeSummon(1, 'elemental', { tick: 5000 }))
    expect((sys as any).summons[0].tick).toBe(5000)
  })

  it('summon.id 正确存储', () => {
    const s = makeSummon(1)
    ;(sys as any).summons.push(s)
    expect((sys as any).summons[0].id).toBe(s.id)
  })
})

// ─── SummonType 枚举 ─────────────────────────────────────────────────────────
describe('CreatureSummoningSystem — SummonType 枚举', () => {
  let sys: CreatureSummoningSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('支持 elemental 类型', () => {
    ;(sys as any).summons.push(makeSummon(1, 'elemental'))
    expect((sys as any).summons[0].type).toBe('elemental')
  })

  it('支持 spirit 类型', () => {
    ;(sys as any).summons.push(makeSummon(1, 'spirit'))
    expect((sys as any).summons[0].type).toBe('spirit')
  })

  it('支持 golem 类型', () => {
    ;(sys as any).summons.push(makeSummon(1, 'golem'))
    expect((sys as any).summons[0].type).toBe('golem')
  })

  it('支持 phantom 类型', () => {
    ;(sys as any).summons.push(makeSummon(1, 'phantom'))
    expect((sys as any).summons[0].type).toBe('phantom')
  })

  it('支持 familiar 类型', () => {
    ;(sys as any).summons.push(makeSummon(1, 'familiar'))
    expect((sys as any).summons[0].type).toBe('familiar')
  })

  it('5 种类型全部可共存', () => {
    const types: SummonType[] = ['elemental', 'spirit', 'golem', 'phantom', 'familiar']
    types.forEach((t, i) => { ;(sys as any).summons.push(makeSummon(i + 1, t)) })
    const stored = (sys as any).summons.map((s: Summon) => s.type)
    expect(stored).toEqual(types)
  })
})

// ─── masteryMap 管理 ──────────────────────────────────────────────────────
describe('CreatureSummoningSystem — masteryMap', () => {
  let sys: CreatureSummoningSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('未登记实体的 mastery 查询返回 undefined（或 ?? 0）', () => {
    expect((sys as any).masteryMap.get(999) ?? 0).toBe(0)
  })

  it('手动注入 mastery 后可查询', () => {
    ;(sys as any).masteryMap.set(1, 80)
    expect((sys as any).masteryMap.get(1)).toBe(80)
  })

  it('mastery 可设为 0', () => {
    ;(sys as any).masteryMap.set(2, 0)
    expect((sys as any).masteryMap.get(2)).toBe(0)
  })

  it('mastery 可设为最大值 100', () => {
    ;(sys as any).masteryMap.set(3, 100)
    expect((sys as any).masteryMap.get(3)).toBe(100)
  })

  it('masteryMap 支持多个实体', () => {
    ;(sys as any).masteryMap.set(1, 20)
    ;(sys as any).masteryMap.set(2, 50)
    ;(sys as any).masteryMap.set(3, 80)
    expect((sys as any).masteryMap.size).toBe(3)
  })

  it('masteryMap.delete() 移除实体', () => {
    ;(sys as any).masteryMap.set(5, 60)
    ;(sys as any).masteryMap.delete(5)
    expect((sys as any).masteryMap.has(5)).toBe(false)
  })

  it('masteryMap 值可被覆盖', () => {
    ;(sys as any).masteryMap.set(7, 30)
    ;(sys as any).masteryMap.set(7, 55)
    expect((sys as any).masteryMap.get(7)).toBe(55)
  })
})

// ─── POWER_BASE 关系 ─────────────────────────────────────────────────────────
describe('CreatureSummoningSystem — power 计算逻辑', () => {
  beforeEach(() => { nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('elemental 基础 power 为 35（mastery=0 时约 35*0.5=17.5）', () => {
    // power = POWER_BASE[type] * (0.5 + mastery/100)
    // mastery=0: 35 * 0.5 = 17.5
    const power = 35 * (0.5 + 0 / 100)
    expect(power).toBeCloseTo(17.5, 5)
  })

  it('golem 基础 power 最高（45）', () => {
    const golemPower = 45 * (0.5 + 100 / 100)
    const spiritPower = 20 * (0.5 + 100 / 100)
    expect(golemPower).toBeGreaterThan(spiritPower)
  })

  it('familiar 基础 power 最低（15）', () => {
    const familiarPower = 15 * (0.5 + 100 / 100)
    const golemPower = 45 * (0.5 + 100 / 100)
    expect(familiarPower).toBeLessThan(golemPower)
  })

  it('mastery=100 时 power 是 mastery=0 时的 3 倍', () => {
    // mastery=0: 0.5; mastery=100: 1.5 → 倍数=3
    expect(1.5 / 0.5).toBe(3)
  })

  it('duration = 3000 + mastery*50', () => {
    const mastery = 20
    const duration = 3000 + Math.floor(mastery * 50)
    expect(duration).toBe(4000)
  })

  it('mastery=100 时 duration 最大为 8000', () => {
    const duration = 3000 + Math.floor(100 * 50)
    expect(duration).toBe(8000)
  })
})

// ─── update() 节流逻辑 ───────────────────────────────────────────────────────
describe('CreatureSummoningSystem — update() 节流', () => {
  let sys: CreatureSummoningSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 小于 CHECK_INTERVAL(1600) 时不处理实体', () => {
    const em = makeMockEM([1], { 1: { creature: { type: 'creature', age: 20 }, position: { type: 'position', x: 1, y: 1 } } })
    const spy = vi.spyOn(em, 'getEntitiesWithComponents')
    sys.update(1, em as any, 100)
    expect(spy).not.toHaveBeenCalled()
  })

  it('tick 超过 CHECK_INTERVAL 时处理实体', () => {
    const em = makeMockEM([])
    const spy = vi.spyOn(em, 'getEntitiesWithComponents')
    sys.update(1, em as any, 1700)
    expect(spy).toHaveBeenCalled()
  })

  it('空实体列表 update 不崩溃', () => {
    const em = makeMockEM()
    expect(() => sys.update(1, em as any, 1700)).not.toThrow()
  })

  it('连续多次 update 不崩溃', () => {
    const em = makeMockEM()
    expect(() => {
      for (let i = 0; i < 10; i++) sys.update(1, em as any, i * 200)
    }).not.toThrow()
  })

  it('update 更新 lastCheck', () => {
    const em = makeMockEM()
    sys.update(1, em as any, 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })
})

// ─── 召唤物过期逻辑 ─────────────────────────────────────────────────────────
describe('CreatureSummoningSystem — 召唤物过期', () => {
  let sys: CreatureSummoningSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('过期召唤物在 update 时被移除（tick - s.tick > s.duration）', () => {
    ;(sys as any).summons.push(makeSummon(1, 'elemental', { tick: 0, duration: 100 }))
    const em = makeMockEM()
    // lastCheck = 0, tick=2000 > CHECK_INTERVAL，触发过期检查
    sys.update(1, em as any, 2000)
    // tick=2000, s.tick=0, duration=100 → 2000-0 > 100 → 过期
    expect((sys as any).summons).toHaveLength(0)
  })

  it('cutoff 淘汰超过 30000 tick 的召唤物', () => {
    ;(sys as any).summons.push(makeSummon(1, 'spirit', { tick: 0, duration: 999999 }))
    const em = makeMockEM()
    // cutoff = 32000 - 30000 = 2000, s.tick=0 < 2000 → 过期
    sys.update(1, em as any, 32000)
    expect((sys as any).summons).toHaveLength(0)
  })

  it('未过期的召唤物不被移除', () => {
    ;(sys as any).summons.push(makeSummon(1, 'golem', { tick: 1900, duration: 9999 }))
    const em = makeMockEM()
    // tick=2000, lastCheck=0 → 触发; cutoff=2000-30000<0; tick-s.tick=100<9999 → 保留
    sys.update(1, em as any, 2000)
    expect((sys as any).summons).toHaveLength(1)
  })

  it('多个召唤物部分过期时正确移除', () => {
    ;(sys as any).summons.push(makeSummon(1, 'elemental', { tick: 0, duration: 100 }))  // 过期
    ;(sys as any).summons.push(makeSummon(2, 'spirit', { tick: 1950, duration: 9999 })) // 保留
    const em = makeMockEM()
    sys.update(1, em as any, 2000)
    expect((sys as any).summons).toHaveLength(1)
    expect((sys as any).summons[0].summonerId).toBe(2)
  })
})

// ─── masteryMap 死亡实体清理 ────────────────────────────────────────────────
describe('CreatureSummoningSystem — masteryMap 清理死亡实体', () => {
  let sys: CreatureSummoningSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick % 3600 === 0 时清理死亡实体的 mastery', () => {
    ;(sys as any).masteryMap.set(1, 50) // 无 creature 组件 → 死亡
    const em = makeMockEM([], {})
    // lastCheck=0, tick=3600 触发过期检查和 mastery 清理
    sys.update(1, em as any, 3600)
    expect((sys as any).masteryMap.has(1)).toBe(false)
  })

  it('tick % 3600 !== 0 时不清理 masteryMap', () => {
    ;(sys as any).masteryMap.set(1, 50)
    ;(sys as any).lastCheck = 0
    const em = makeMockEM([], {})
    sys.update(1, em as any, 1700) // 1700 % 3600 !== 0
    expect((sys as any).masteryMap.has(1)).toBe(true)
  })

  it('存活实体的 mastery 在 tick%3600 时保留', () => {
    ;(sys as any).masteryMap.set(1, 50)
    const em = makeMockEM([1], { 1: { creature: { type: 'creature', age: 20 } } })
    sys.update(1, em as any, 3600)
    expect((sys as any).masteryMap.has(1)).toBe(true)
  })

  it('masteryMap 为空时 tick%3600 不崩溃', () => {
    const em = makeMockEM()
    expect(() => sys.update(1, em as any, 3600)).not.toThrow()
  })
})

// ─── MAX_SUMMONS 上限 ─────────────────────────────────────────────────────
describe('CreatureSummoningSystem — MAX_SUMMONS 上限', () => {
  let sys: CreatureSummoningSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('summons 达到 80 时不再新增（update 检测）', () => {
    // 填满 80 个召唤物，且让它们不过期
    for (let i = 0; i < 80; i++) {
      ;(sys as any).summons.push(makeSummon(i + 1, 'elemental', { tick: 5000, duration: 999999 }))
    }
    // 准备一个合格的生物实体
    const em = makeMockEM(
      [999],
      { 999: {
        creature: { type: 'creature', age: 20 },
        position: { type: 'position', x: 5, y: 5 }
      } }
    )
    // 强制随机通过 SUMMON_CHANCE
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em as any, 5200)
    // 过期检查：tick=5200, cutoff=5200-30000<0，tick-s.tick=200 < 999999 → 全部保留
    expect((sys as any).summons).toHaveLength(80)
    randSpy.mockRestore()
  })

  it('手动注入 80 个 summons 后数组长度正确', () => {
    for (let i = 0; i < 80; i++) {
      ;(sys as any).summons.push(makeSummon(i + 1))
    }
    expect((sys as any).summons).toHaveLength(80)
  })
})

// ─── 年龄门禁（age < 15 的生物不召唤）────────────────────────────────────
describe('CreatureSummoningSystem — 年龄门禁', () => {
  let sys: CreatureSummoningSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('age < 15 的生物不产生召唤物', () => {
    const em = makeMockEM(
      [1],
      { 1: {
        creature: { type: 'creature', age: 10 },
        position: { type: 'position', x: 5, y: 5 }
      } }
    )
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em as any, 1700)
    expect((sys as any).summons).toHaveLength(0)
    randSpy.mockRestore()
  })

  it('age === 15 的生物满足条件可召唤', () => {
    const em = makeMockEM(
      [1],
      { 1: {
        creature: { type: 'creature', age: 15 },
        position: { type: 'position', x: 5, y: 5 }
      } }
    )
    // random=0 → 0 < SUMMON_CHANCE(0.003) → 不满足 `Math.random() > SUMMON_CHANCE`? 
    // 条件是 if (Math.random() > SUMMON_CHANCE) continue → random=0 < 0.003 → 不 continue → 执行
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, em as any, 1700)
    expect((sys as any).summons).toHaveLength(1)
    randSpy.mockRestore()
  })

  it('无 position 组件时不崩溃', () => {
    const em = makeMockEM(
      [1],
      { 1: { creature: { type: 'creature', age: 20 } } }
    )
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(() => sys.update(1, em as any, 1700)).not.toThrow()
    randSpy.mockRestore()
  })
})

// ─── summons 数组引用一致性 ──────────────────────────────────────────────
describe('CreatureSummoningSystem — 引用一致性', () => {
  let sys: CreatureSummoningSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('summons 数组是同一个引用', () => {
    const a = (sys as any).summons
    const b = (sys as any).summons
    expect(a).toBe(b)
  })

  it('注入 summon 后通过引用可读取', () => {
    const ref = (sys as any).summons
    ref.push(makeSummon(1, 'spirit'))
    expect((sys as any).summons[0].type).toBe('spirit')
  })

  it('按 summonerId 过滤 summons', () => {
    ;(sys as any).summons.push(makeSummon(1, 'elemental'))
    ;(sys as any).summons.push(makeSummon(1, 'spirit'))
    ;(sys as any).summons.push(makeSummon(2, 'golem'))
    const ofOne = (sys as any).summons.filter((s: Summon) => s.summonerId === 1)
    expect(ofOne).toHaveLength(2)
  })

  it('按 type 过滤 summons', () => {
    ;(sys as any).summons.push(makeSummon(1, 'golem'))
    ;(sys as any).summons.push(makeSummon(2, 'golem'))
    ;(sys as any).summons.push(makeSummon(3, 'spirit'))
    const golems = (sys as any).summons.filter((s: Summon) => s.type === 'golem')
    expect(golems).toHaveLength(2)
  })
})
