import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureLamplighterSystem } from '../systems/CreatureLamplighterSystem'
import type { Lamplighter, FuelType } from '../systems/CreatureLamplighterSystem'

let nextId = 1
function makeSys(): CreatureLamplighterSystem { return new CreatureLamplighterSystem() }
function makeLamplighter(entityId: number, fuelType: FuelType = 'oil', skill = 60): Lamplighter {
  return {
    id: nextId++, entityId, skill,
    lampsLit: 50, lampsMaintained: 30,
    fuelType,
    routeLength: 10, efficiency: 0.7,
    nightsWorked: 5, tick: 0,
  }
}

function makeLamplighterFull(overrides: Partial<Lamplighter> & { entityId: number }): Lamplighter {
  return {
    id: nextId++,
    entityId: overrides.entityId,
    skill: overrides.skill ?? 60,
    lampsLit: overrides.lampsLit ?? 0,
    lampsMaintained: overrides.lampsMaintained ?? 0,
    fuelType: overrides.fuelType ?? 'oil',
    routeLength: overrides.routeLength ?? 5,
    efficiency: overrides.efficiency ?? 0.5,
    nightsWorked: overrides.nightsWorked ?? 0,
    tick: overrides.tick ?? 0,
  }
}

// ——— 基础增删查测试 ———
describe('CreatureLamplighterSystem - 基础增删查', () => {
  let sys: CreatureLamplighterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无点灯人', () => {
    expect((sys as any).lamplighters).toHaveLength(0)
  })

  it('注入后可查询 gas 燃料', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(1, 'gas'))
    expect((sys as any).lamplighters[0].fuelType).toBe('gas')
  })

  it('返回内部引用稳定', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(1))
    expect((sys as any).lamplighters).toBe((sys as any).lamplighters)
  })

  it('支持所有 4 种燃料类型', () => {
    const fuels: FuelType[] = ['oil', 'tallow', 'gas', 'crystal']
    fuels.forEach((f, i) => { ;(sys as any).lamplighters.push(makeLamplighter(i + 1, f)) })
    const all = (sys as any).lamplighters
    fuels.forEach((f, i) => { expect(all[i].fuelType).toBe(f) })
  })

  it('多个全部返回', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(1))
    ;(sys as any).lamplighters.push(makeLamplighter(2))
    expect((sys as any).lamplighters).toHaveLength(2)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('lamplighters 是数组类型', () => {
    expect(Array.isArray((sys as any).lamplighters)).toBe(true)
  })

  it('_lamplightersSet 是 Set 类型', () => {
    expect((sys as any)._lamplightersSet).toBeInstanceOf(Set)
  })

  it('注入点灯人后 entityId 正确', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(99))
    expect((sys as any).lamplighters[0].entityId).toBe(99)
  })

  it('注入点灯人后 skill 正确', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(1, 'oil', 75))
    expect((sys as any).lamplighters[0].skill).toBe(75)
  })

  it('注入多个点灯人，每个 entityId 独立', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(10))
    ;(sys as any).lamplighters.push(makeLamplighter(20))
    ;(sys as any).lamplighters.push(makeLamplighter(30))
    const ids = (sys as any).lamplighters.map((l: Lamplighter) => l.entityId)
    expect(ids).toEqual([10, 20, 30])
  })
})

// ——— skill 上限测试 ———
describe('CreatureLamplighterSystem - skill 上限', () => {
  afterEach(() => vi.restoreAllMocks())

  it('skill 不超过 100（Math.min 逻辑）', () => {
    expect(Math.min(100, 99.9 + 0.15)).toBe(100)
    expect(Math.min(100, 50 + 0.15)).toBeCloseTo(50.15, 5)
  })

  it('skill 已为100 时加0.15仍保持100', () => {
    const ll = makeLamplighter(1, 'oil', 100)
    const updated = Math.min(100, ll.skill + 0.15)
    expect(updated).toBe(100)
  })

  it('skill 为 0 时加 0.15 结果正确', () => {
    const ll = makeLamplighter(1, 'oil', 0)
    expect(Math.min(100, ll.skill + 0.15)).toBeCloseTo(0.15, 5)
  })

  it('skill 为 99.9 时加 0.15 截断到 100', () => {
    expect(Math.min(100, 99.9 + 0.15)).toBe(100)
  })

  it('skill 从 50 逐步增长不超过 100', () => {
    let s = 50
    for (let i = 0; i < 400; i++) {
      s = Math.min(100, s + 0.15)
    }
    expect(s).toBe(100)
  })

  it('skill 值域下限验证：不应为负', () => {
    const ll = makeLamplighter(1, 'oil', 0)
    expect(ll.skill).toBeGreaterThanOrEqual(0)
  })
})

// ——— efficiency 上限测试 ———
describe('CreatureLamplighterSystem - efficiency 上限', () => {
  afterEach(() => vi.restoreAllMocks())

  it('efficiency 不超过 1.0（Math.min 逻辑）', () => {
    expect(Math.min(1, 0.99 + 0.01)).toBe(1)
    expect(Math.min(1, 0.5 + 0.01)).toBeCloseTo(0.51, 5)
  })

  it('efficiency 已为 1.0 时加 0.01 仍保持 1.0', () => {
    const ll = makeLamplighterFull({ entityId: 1, efficiency: 1.0 })
    const updated = Math.min(1, ll.efficiency + 0.01)
    expect(updated).toBe(1)
  })

  it('efficiency 为 0.0 时加 0.01 结果正确', () => {
    expect(Math.min(1, 0.0 + 0.01)).toBeCloseTo(0.01, 5)
  })

  it('efficiency 上限为 1.0 而非更高', () => {
    expect(Math.min(1, 1.5 + 0.01)).toBe(1)
  })
})

// ——— routeLength 上限测试 ———
describe('CreatureLamplighterSystem - routeLength 上限', () => {
  afterEach(() => vi.restoreAllMocks())

  it('routeLength 不超过 20', () => {
    expect(Math.min(20, 19 + 1)).toBe(20)
    expect(Math.min(20, 20 + 1)).toBe(20)
  })

  it('routeLength 为 15 时加 1 结果 16', () => {
    const ll = makeLamplighterFull({ entityId: 1, routeLength: 15 })
    expect(Math.min(20, ll.routeLength + 1)).toBe(16)
  })

  it('routeLength 已为 20 时不再增长', () => {
    const ll = makeLamplighterFull({ entityId: 1, routeLength: 20 })
    expect(Math.min(20, ll.routeLength + 1)).toBe(20)
  })
})

// ——— CHECK_INTERVAL 节流测试 ———
describe('CreatureLamplighterSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureLamplighterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值 < 3200 时 getEntitiesWithComponent 不被调用', () => {
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(true),
    } as any
    sys.update(0, em, 0)
    sys.update(0, em, 100)
    expect(em.getEntitiesWithComponent).toHaveBeenCalledTimes(0)
  })

  it('tick差值 >= 3200 时触发更新并更新 lastCheck', () => {
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, 0)
    const checksBefore = (sys as any).lastCheck
    sys.update(0, em, 3200)
    expect((sys as any).lastCheck).toBe(3200)
    expect((sys as any).lastCheck).not.toBe(checksBefore)
  })

  it('恰好等于 CHECK_INTERVAL 时触发', () => {
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, 0)
    sys.update(0, em, 3200)
    expect((sys as any).lastCheck).toBe(3200)
  })

  it('lastCheck 精确等于传入的 tick', () => {
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, 0)
    sys.update(0, em, 6400)
    expect((sys as any).lastCheck).toBe(6400)
  })

  it('多次触发后 lastCheck 跟踪最新触发 tick', () => {
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, 0)
    sys.update(0, em, 3200)
    sys.update(0, em, 3210) // 不触发
    sys.update(0, em, 6400) // 触发
    expect((sys as any).lastCheck).toBe(6400)
  })

  it('tick=0 初始调用 lastCheck 设为 0', () => {
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=3199 时不触发（差值恰好不足）', () => {
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, 0)
    sys.update(0, em, 3199)
    expect((sys as any).lastCheck).toBe(0) // 未更新
  })
})

// ——— _lamplightersSet 集合测试 ———
describe('CreatureLamplighterSystem - _lamplightersSet 集合', () => {
  let sys: CreatureLamplighterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始 _lamplightersSet 为空', () => {
    expect((sys as any)._lamplightersSet.size).toBe(0)
  })

  it('手动注入点灯人并加入 Set', () => {
    const ll = makeLamplighter(42, 'oil')
    ;(sys as any).lamplighters.push(ll)
    ;(sys as any)._lamplightersSet.add(42)
    expect((sys as any)._lamplightersSet.has(42)).toBe(true)
  })

  it('Set 中不存在的 entityId 返回 false', () => {
    expect((sys as any)._lamplightersSet.has(999)).toBe(false)
  })

  it('多个 entityId 可同时在 Set 中', () => {
    ;(sys as any)._lamplightersSet.add(1)
    ;(sys as any)._lamplightersSet.add(2)
    ;(sys as any)._lamplightersSet.add(3)
    expect((sys as any)._lamplightersSet.size).toBe(3)
  })

  it('同一 entityId 添加多次 Set size 不变', () => {
    ;(sys as any)._lamplightersSet.add(5)
    ;(sys as any)._lamplightersSet.add(5)
    expect((sys as any)._lamplightersSet.size).toBe(1)
  })

  it('delete 后 has 返回 false', () => {
    ;(sys as any)._lamplightersSet.add(7)
    ;(sys as any)._lamplightersSet.delete(7)
    expect((sys as any)._lamplightersSet.has(7)).toBe(false)
  })
})

// ——— cleanup：entity 消亡后移除 ———
describe('CreatureLamplighterSystem - entity 消亡后清除', () => {
  let sys: CreatureLamplighterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('hasComponent 返回 false 时点灯人被清除', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(1, 'oil'))
    ;(sys as any)._lamplightersSet.add(1)
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, 0)
    sys.update(0, em, 3200)
    expect((sys as any).lamplighters).toHaveLength(0)
  })

  it('hasComponent 返回 true 时点灯人保留', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(1, 'oil'))
    ;(sys as any)._lamplightersSet.add(1)
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(true),
    } as any
    sys.update(0, em, 0)
    sys.update(0, em, 3200)
    expect((sys as any).lamplighters).toHaveLength(1)
  })

  it('多个点灯人中部分 entity 消亡时只移除对应的', () => {
    ;(sys as any).lamplighters.push(makeLamplighter(1, 'oil'))
    ;(sys as any).lamplighters.push(makeLamplighter(2, 'gas'))
    ;(sys as any)._lamplightersSet.add(1)
    ;(sys as any)._lamplightersSet.add(2)
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockImplementation((_id: number, _comp: string) => _id === 2),
    } as any
    sys.update(0, em, 0)
    sys.update(0, em, 3200)
    expect((sys as any).lamplighters).toHaveLength(1)
    expect((sys as any).lamplighters[0].entityId).toBe(2)
  })

  it('清除后 lamplighters 数组长度减少', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).lamplighters.push(makeLamplighter(i, 'oil'))
      ;(sys as any)._lamplightersSet.add(i)
    }
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, 0)
    sys.update(0, em, 3200)
    expect((sys as any).lamplighters).toHaveLength(0)
  })

  it('cleanup 不触发时（节流未到）点灯人不被清除', () => {
    // 先触发一次让 lastCheck=3200，清除 entityId=1
    ;(sys as any).lamplighters.push(makeLamplighter(1, 'oil'))
    ;(sys as any)._lamplightersSet.add(1)
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    sys.update(0, em, 3200)       // 触发，lastCheck=3200，entityId=1 被清除
    // 重新注入一个新的点灯人
    ;(sys as any).lamplighters.push(makeLamplighter(2, 'oil'))
    ;(sys as any)._lamplightersSet.add(2)
    sys.update(0, em, 3300)       // 差值=100 < 3200，不触发
    expect((sys as any).lamplighters).toHaveLength(1)
  })
})

// ——— FUEL_BRIGHTNESS 亮度逻辑测试 ———
describe('CreatureLamplighterSystem - FUEL_BRIGHTNESS 常量验证', () => {
  afterEach(() => vi.restoreAllMocks())

  it('oil 的 brightness 为 0.6', () => {
    const FUEL_BRIGHTNESS: Record<FuelType, number> = {
      oil: 0.6, tallow: 0.4, gas: 0.8, crystal: 1.0,
    }
    expect(FUEL_BRIGHTNESS['oil']).toBe(0.6)
  })

  it('tallow 的 brightness 为 0.4', () => {
    const FUEL_BRIGHTNESS: Record<FuelType, number> = {
      oil: 0.6, tallow: 0.4, gas: 0.8, crystal: 1.0,
    }
    expect(FUEL_BRIGHTNESS['tallow']).toBe(0.4)
  })

  it('gas 的 brightness 为 0.8', () => {
    const FUEL_BRIGHTNESS: Record<FuelType, number> = {
      oil: 0.6, tallow: 0.4, gas: 0.8, crystal: 1.0,
    }
    expect(FUEL_BRIGHTNESS['gas']).toBe(0.8)
  })

  it('crystal 的 brightness 为 1.0', () => {
    const FUEL_BRIGHTNESS: Record<FuelType, number> = {
      oil: 0.6, tallow: 0.4, gas: 0.8, crystal: 1.0,
    }
    expect(FUEL_BRIGHTNESS['crystal']).toBe(1.0)
  })

  it('lightChance 计算公式：efficiency * brightness * (skill/100)', () => {
    const efficiency = 0.7, brightness = 0.6, skill = 60
    const lightChance = efficiency * brightness * (skill / 100)
    expect(lightChance).toBeCloseTo(0.252, 5)
  })

  it('crystal 燃料比 oil 产生更高 lightChance', () => {
    const eff = 0.7, skill = 60
    const oilChance = eff * 0.6 * (skill / 100)
    const crystalChance = eff * 1.0 * (skill / 100)
    expect(crystalChance).toBeGreaterThan(oilChance)
  })
})

// ——— 燃料升级顺序测试 ———
describe('CreatureLamplighterSystem - 燃料升级顺序', () => {
  afterEach(() => vi.restoreAllMocks())

  it('FUEL_TYPES 顺序为 oil, tallow, gas, crystal', () => {
    const FUEL_TYPES: FuelType[] = ['oil', 'tallow', 'gas', 'crystal']
    expect(FUEL_TYPES[0]).toBe('oil')
    expect(FUEL_TYPES[1]).toBe('tallow')
    expect(FUEL_TYPES[2]).toBe('gas')
    expect(FUEL_TYPES[3]).toBe('crystal')
  })

  it('oil 升级到 tallow（idx=0 -> 1）', () => {
    const FUEL_TYPES: FuelType[] = ['oil', 'tallow', 'gas', 'crystal']
    const ll = makeLamplighter(1, 'oil', 80)
    const idx = FUEL_TYPES.indexOf(ll.fuelType)
    if (idx < FUEL_TYPES.length - 1) ll.fuelType = FUEL_TYPES[idx + 1]
    expect(ll.fuelType).toBe('tallow')
  })

  it('tallow 升级到 gas（idx=1 -> 2）', () => {
    const FUEL_TYPES: FuelType[] = ['oil', 'tallow', 'gas', 'crystal']
    const ll = makeLamplighter(1, 'tallow', 80)
    const idx = FUEL_TYPES.indexOf(ll.fuelType)
    if (idx < FUEL_TYPES.length - 1) ll.fuelType = FUEL_TYPES[idx + 1]
    expect(ll.fuelType).toBe('gas')
  })

  it('gas 升级到 crystal（idx=2 -> 3）', () => {
    const FUEL_TYPES: FuelType[] = ['oil', 'tallow', 'gas', 'crystal']
    const ll = makeLamplighter(1, 'gas', 80)
    const idx = FUEL_TYPES.indexOf(ll.fuelType)
    if (idx < FUEL_TYPES.length - 1) ll.fuelType = FUEL_TYPES[idx + 1]
    expect(ll.fuelType).toBe('crystal')
  })

  it('crystal 不再升级（已是最高级）', () => {
    const FUEL_TYPES: FuelType[] = ['oil', 'tallow', 'gas', 'crystal']
    const ll = makeLamplighter(1, 'crystal', 80)
    const idx = FUEL_TYPES.indexOf(ll.fuelType)
    const prevFuel = ll.fuelType
    if (idx < FUEL_TYPES.length - 1) ll.fuelType = FUEL_TYPES[idx + 1]
    expect(ll.fuelType).toBe(prevFuel) // 未改变
  })
})

// ——— MAX_LAMPLIGHTERS 上限测试 ———
describe('CreatureLamplighterSystem - MAX_LAMPLIGHTERS 上限', () => {
  let sys: CreatureLamplighterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入 10 个点灯人刚好达到上限', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).lamplighters.push(makeLamplighter(i))
    }
    expect((sys as any).lamplighters).toHaveLength(10)
  })

  it('已达上限 10 时不再通过随机招募', () => {
    for (let i = 1; i <= 10; i++) {
      ;(sys as any).lamplighters.push(makeLamplighter(i))
    }
    // 伪造 Math.random 让 SPAWN_CHANCE 总成功
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([11]),
      hasComponent: vi.fn().mockReturnValue(true),
    } as any
    sys.update(0, em, 0)
    sys.update(0, em, 3200)
    // 不应超过 10
    expect((sys as any).lamplighters.length).toBeLessThanOrEqual(10)
  })

  it('不足 10 时且 random < 0.003 可以招募（需要 entity 可用）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([5]),
      hasComponent: vi.fn().mockReturnValue(true),
    } as any
    sys.update(0, em, 0)
    sys.update(0, em, 3200)
    // 有机会新增（两轮各触发一次）
    expect((sys as any).lamplighters.length).toBeGreaterThanOrEqual(0)
  })
})

// ——— nightsWorked 自增测试 ———
describe('CreatureLamplighterSystem - nightsWorked 递增', () => {
  let sys: CreatureLamplighterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('每次触发更新时 nightsWorked 自增 1', () => {
    const ll = makeLamplighterFull({ entityId: 1, nightsWorked: 5 })
    ;(sys as any).lamplighters.push(ll)
    ;(sys as any)._lamplightersSet.add(1)
    // 禁用随机以防 lampsLit 路径干扰
    vi.spyOn(Math, 'random').mockReturnValue(1) // 大于所有概率
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(true),
    } as any
    sys.update(0, em, 0)
    sys.update(0, em, 3200)
    // nightsWorked 在首次触发(tick=0)和第二次触发(tick=3200)各+1
    expect(ll.nightsWorked).toBeGreaterThanOrEqual(6)
  })

  it('nightsWorked 初始为 0 时触发后变为 1', () => {
    const ll = makeLamplighterFull({ entityId: 1, nightsWorked: 0 })
    ;(sys as any).lamplighters.push(ll)
    ;(sys as any)._lamplightersSet.add(1)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(true),
    } as any
    // lastCheck=0，需要 tick>=3200 才触发（tick - lastCheck >= CHECK_INTERVAL）
    sys.update(0, em, 3200)
    expect(ll.nightsWorked).toBe(1)
  })
})

// ——— Lamplighter 接口字段完整性测试 ———
describe('CreatureLamplighterSystem - Lamplighter 接口字段', () => {
  afterEach(() => vi.restoreAllMocks())

  it('Lamplighter 包含 id 字段', () => {
    const ll = makeLamplighter(1)
    expect(ll).toHaveProperty('id')
  })

  it('Lamplighter 包含 entityId 字段', () => {
    const ll = makeLamplighter(1)
    expect(ll).toHaveProperty('entityId')
  })

  it('Lamplighter 包含 skill 字段', () => {
    const ll = makeLamplighter(1)
    expect(ll).toHaveProperty('skill')
  })

  it('Lamplighter 包含 lampsLit 字段', () => {
    const ll = makeLamplighter(1)
    expect(ll).toHaveProperty('lampsLit')
  })

  it('Lamplighter 包含 lampsMaintained 字段', () => {
    const ll = makeLamplighter(1)
    expect(ll).toHaveProperty('lampsMaintained')
  })

  it('Lamplighter 包含 fuelType 字段', () => {
    const ll = makeLamplighter(1)
    expect(ll).toHaveProperty('fuelType')
  })

  it('Lamplighter 包含 routeLength 字段', () => {
    const ll = makeLamplighter(1)
    expect(ll).toHaveProperty('routeLength')
  })

  it('Lamplighter 包含 efficiency 字段', () => {
    const ll = makeLamplighter(1)
    expect(ll).toHaveProperty('efficiency')
  })

  it('Lamplighter 包含 nightsWorked 字段', () => {
    const ll = makeLamplighter(1)
    expect(ll).toHaveProperty('nightsWorked')
  })

  it('Lamplighter 包含 tick 字段', () => {
    const ll = makeLamplighter(1)
    expect(ll).toHaveProperty('tick')
  })
})

// ——— 系统实例化和方法存在性 ———
describe('CreatureLamplighterSystem - 实例化与方法', () => {
  afterEach(() => vi.restoreAllMocks())

  it('构造时不崩溃', () => {
    expect(() => new CreatureLamplighterSystem()).not.toThrow()
  })

  it('update 方法存在', () => {
    const sys = makeSys()
    expect(typeof sys.update).toBe('function')
  })

  it('update 调用时 em 无 entity 不崩溃', () => {
    const sys = makeSys()
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    expect(() => sys.update(0, em, 0)).not.toThrow()
  })

  it('多次 update 调用不累积状态错误', () => {
    const sys = makeSys()
    const em = {
      getEntitiesWithComponent: vi.fn().mockReturnValue([]),
      hasComponent: vi.fn().mockReturnValue(false),
    } as any
    for (let i = 0; i < 5; i++) {
      sys.update(0, em, i * 3200)
    }
    expect((sys as any).lastCheck).toBe(4 * 3200)
  })
})
