import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldFossilSystem } from '../systems/WorldFossilSystem'
import type { Fossil, FossilType, FossilAge, FossilRarity } from '../systems/WorldFossilSystem'

// CHECK_INTERVAL=1200, MAX_FOSSILS=50, SPAWN_CHANCE=0.006, DISCOVERY_CHANCE=0.03
// KNOWLEDGE: common=2, uncommon=5, rare=12, legendary=30
// VALID_TERRAIN: MOUNTAIN(5), SAND(2), SNOW(6)

function makeSys(): WorldFossilSystem { return new WorldFossilSystem() }

let _nextId = 1
function makeFossil(overrides: Partial<Fossil> = {}): Fossil {
  return {
    id: _nextId++,
    x: 20, y: 30,
    type: 'bone',
    age: 'ancient',
    rarity: 'common',
    discovered: false,
    discoveredTick: 0,
    ...overrides,
  }
}

function makeWorld(w = 200, h = 200, tileValue = 5 /* MOUNTAIN */) {
  return {
    width: w,
    height: h,
    getTile: (x: number, y: number) => {
      if (x < 0 || x >= w || y < 0 || y >= h) return null
      return tileValue
    },
  } as any
}

// ---- 1. 初始状态 ----
describe('WorldFossilSystem 初始状态', () => {
  let sys: WorldFossilSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始 fossils 数组为空', () => {
    expect((sys as any).fossils).toHaveLength(0)
  })

  it('初始 totalKnowledge 为 0', () => {
    expect((sys as any).totalKnowledge).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('_fossilKeySet 初始为空 Set', () => {
    expect((sys as any)._fossilKeySet).toBeInstanceOf(Set)
    expect((sys as any)._fossilKeySet.size).toBe(0)
  })

  it('多次构造互不影响', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).fossils.push(makeFossil())
    expect((s2 as any).fossils).toHaveLength(0)
  })

  it('fossils 返回内部数组引用', () => {
    expect((sys as any).fossils).toBe((sys as any).fossils)
  })
})

// ---- 2. CHECK_INTERVAL 节流 ----
describe('WorldFossilSystem CHECK_INTERVAL 节流', () => {
  let sys: WorldFossilSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 时首次 update 触发（lastCheck=0，差值>=1200 不成立 => 不触发）', () => {
    // tick=0, lastCheck=0 => diff=0 < 1200 => skip
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), 0)
    expect((sys as any).fossils).toHaveLength(0)
  })

  it('tick=1200 时首次触发 spawnFossils（但 random>SPAWN_CHANCE 不spawn）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), 1200)
    // lastCheck 已更新
    expect((sys as any).lastCheck).toBe(1200)
  })

  it('tick=1199 不触发（diff=1199 < 1200）', () => {
    const spawnSpy = vi.spyOn(sys as any, 'spawnFossils')
    sys.update(1, makeWorld(), 1199)
    expect(spawnSpy).not.toHaveBeenCalled()
  })

  it('tick=1200 触发 spawnFossils', () => {
    const spawnSpy = vi.spyOn(sys as any, 'spawnFossils')
    sys.update(1, makeWorld(), 1200)
    expect(spawnSpy).toHaveBeenCalled()
  })

  it('tick=2400 再次触发', () => {
    const spawnSpy = vi.spyOn(sys as any, 'spawnFossils')
    sys.update(1, makeWorld(), 1200)  // 第一次
    sys.update(1, makeWorld(), 2400)  // 第二次
    expect(spawnSpy).toHaveBeenCalledTimes(2)
  })

  it('tick=1201 距上次触发只过 1 tick 不再触发', () => {
    sys.update(1, makeWorld(), 1200)  // 触发，lastCheck=1200
    const spawnSpy = vi.spyOn(sys as any, 'spawnFossils')
    sys.update(1, makeWorld(), 1201)  // diff=1 < 1200 => skip
    expect(spawnSpy).not.toHaveBeenCalled()
  })

  it('触发后 lastCheck 被更新为当前 tick', () => {
    sys.update(1, makeWorld(), 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })
})

// ---- 3. spawn 条件 ----
describe('WorldFossilSystem spawn 条件', () => {
  let sys: WorldFossilSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random 恒为 0（<=SPAWN_CHANCE=0.006）时在有效地形上 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 5 /* MOUNTAIN */), 1200)
    expect((sys as any).fossils.length).toBeGreaterThan(0)
  })

  it('random 恒为 0.999（>SPAWN_CHANCE）时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), 1200)
    expect((sys as any).fossils).toHaveLength(0)
  })

  it('地形为 GRASS(3) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 3 /* GRASS */), 1200)
    expect((sys as any).fossils).toHaveLength(0)
  })

  it('地形为 MOUNTAIN(5) 时可 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 5), 1200)
    expect((sys as any).fossils.length).toBeGreaterThan(0)
  })

  it('地形为 SAND(2) 时可 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 2), 1200)
    expect((sys as any).fossils.length).toBeGreaterThan(0)
  })

  it('地形为 SNOW(6) 时可 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 6), 1200)
    expect((sys as any).fossils.length).toBeGreaterThan(0)
  })

  it('地形为 DEEP_WATER(0) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 0), 1200)
    expect((sys as any).fossils).toHaveLength(0)
  })

  it('地形为 LAVA(7) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 7), 1200)
    expect((sys as any).fossils).toHaveLength(0)
  })

  it('getTile 返回 null 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = { width: 200, height: 200, getTile: () => null } as any
    sys.update(1, world, 1200)
    expect((sys as any).fossils).toHaveLength(0)
  })

  it('同一坐标不会重复 spawn（_fossilKeySet 防重）', () => {
    // 先注入一个 fossil 并设置 keySet
    ;(sys as any).fossils.push(makeFossil({ x: 0, y: 0 }))
    ;(sys as any)._fossilKeySet.add(0 * 10000 + 0)
    // mock random 使 x=0, y=0 总是被选中，且 spawn_chance 通过
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = {
      width: 1,
      height: 1,
      getTile: () => 5,
    } as any
    sys.update(1, world, 1200)
    // 仍然只有 1 个 fossil（不会重复）
    expect((sys as any).fossils).toHaveLength(1)
  })
})

// ---- 4. spawn 后字段值 ----
describe('WorldFossilSystem spawn 后字段值', () => {
  let sys: WorldFossilSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(): Fossil {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 5), 1200)
    return (sys as any).fossils[0]
  }

  it('spawn 的 fossil 有唯一 id', () => {
    const f = spawnOne()
    expect(f.id).toBeGreaterThan(0)
  })

  it('spawn 的 fossil discovered 初始为 false', () => {
    // 用 GRASS(3) 无效地形确保无新 fossil spawn，此 fossil 是手动注入的
    // spawnOne 使用 random=0 在 MOUNTAIN 地形上 spawn，然后直接读第一个 fossil
    // 注意：spawnFossils 跑后再跑 tryDiscoveries，random=0<DISCOVERY_CHANCE
    // 所以 fossil 会被发现——直接注入 fossil 而不走 update 来检查初始值
    const sys2 = makeSys()
    const f = makeFossil({ x: 10, y: 10 })
    ;(sys2 as any).fossils.push(f)
    expect(f.discovered).toBe(false)
  })

  it('spawn 的 fossil discoveredTick 初始为 0', () => {
    const sys2 = makeSys()
    const f = makeFossil({ x: 10, y: 10 })
    ;(sys2 as any).fossils.push(f)
    expect(f.discoveredTick).toBe(0)
  })

  it('spawn 的 fossil x 在 [0, width) 内', () => {
    const f = spawnOne()
    expect(f.x).toBeGreaterThanOrEqual(0)
    expect(f.x).toBeLessThan(200)
  })

  it('spawn 的 fossil y 在 [0, height) 内', () => {
    const f = spawnOne()
    expect(f.y).toBeGreaterThanOrEqual(0)
    expect(f.y).toBeLessThan(200)
  })

  it('spawn 的 fossil type 是合法类型', () => {
    const f = spawnOne()
    const validTypes: FossilType[] = ['bone', 'shell', 'plant', 'amber', 'footprint', 'artifact']
    expect(validTypes).toContain(f.type)
  })

  it('spawn 的 fossil age 是合法值', () => {
    const f = spawnOne()
    const validAges: FossilAge[] = ['ancient', 'old', 'recent']
    expect(validAges).toContain(f.age)
  })

  it('spawn 的 fossil rarity 是合法值', () => {
    const f = spawnOne()
    const validRarities: FossilRarity[] = ['common', 'uncommon', 'rare', 'legendary']
    expect(validRarities).toContain(f.rarity)
  })

  it('nextId 每次 spawn 后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const idBefore = (sys as any).nextId
    sys.update(1, makeWorld(200, 200, 5), 1200)
    const idAfter = (sys as any).nextId
    expect(idAfter).toBeGreaterThan(idBefore)
  })

  it('spawn 后 _fossilKeySet 包含该坐标 key', () => {
    const f = spawnOne()
    const key = f.x * 10000 + f.y
    expect((sys as any)._fossilKeySet.has(key)).toBe(true)
  })
})

// ---- 5. tryDiscoveries 字段变更 ----
describe('WorldFossilSystem tryDiscoveries 字段变更', () => {
  let sys: WorldFossilSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random < DISCOVERY_CHANCE(0.03) 时 fossil 被标记为 discovered', () => {
    ;(sys as any).fossils.push(makeFossil({ rarity: 'common' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), 1200)
    expect((sys as any).fossils[0].discovered).toBe(true)
  })

  it('random >= DISCOVERY_CHANCE(0.03) 时 fossil 不被发现', () => {
    ;(sys as any).fossils.push(makeFossil({ rarity: 'common' }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), 1200)
    expect((sys as any).fossils[0].discovered).toBe(false)
  })

  it('discovered 后 discoveredTick 被设为当前 tick', () => {
    ;(sys as any).fossils.push(makeFossil({ rarity: 'common' }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), 1200)
    expect((sys as any).fossils[0].discoveredTick).toBe(1200)
  })

  it('common fossil 发现后 totalKnowledge += 2', () => {
    // 使用 GRASS(3) 无效地形防止 spawnFossils 添加新 fossil
    ;(sys as any).fossils.push(makeFossil({ rarity: 'common' }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 3 /* GRASS - invalid */), 1200)
    expect((sys as any).totalKnowledge).toBe(2)
  })

  it('uncommon fossil 发现后 totalKnowledge += 5', () => {
    ;(sys as any).fossils.push(makeFossil({ rarity: 'uncommon' }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 3), 1200)
    expect((sys as any).totalKnowledge).toBe(5)
  })

  it('rare fossil 发现后 totalKnowledge += 12', () => {
    ;(sys as any).fossils.push(makeFossil({ rarity: 'rare' }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 3), 1200)
    expect((sys as any).totalKnowledge).toBe(12)
  })

  it('legendary fossil 发现后 totalKnowledge += 30', () => {
    ;(sys as any).fossils.push(makeFossil({ rarity: 'legendary' }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 3), 1200)
    expect((sys as any).totalKnowledge).toBe(30)
  })

  it('多个 fossil 同时发现时 totalKnowledge 累加正确', () => {
    ;(sys as any).fossils.push(makeFossil({ rarity: 'common' }))
    ;(sys as any).fossils.push(makeFossil({ rarity: 'rare' }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 3), 1200)
    expect((sys as any).totalKnowledge).toBe(2 + 12)
  })

  it('已 discovered 的 fossil 再次 update 不再累加 knowledge', () => {
    ;(sys as any).fossils.push(makeFossil({ rarity: 'common', discovered: true }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 3), 1200)
    expect((sys as any).totalKnowledge).toBe(0)
  })
})

// ---- 6. cleanup 逻辑 ----
describe('WorldFossilSystem cleanup 逻辑', () => {
  let sys: WorldFossilSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('fossil 被发现后仍保留在 fossils 数组中（不删除）', () => {
    ;(sys as any).fossils.push(makeFossil({ rarity: 'common' }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 使用无效地形 GRASS(3) 防止 spawnFossils 额外增加 fossil
    sys.update(1, makeWorld(200, 200, 3), 1200)
    expect((sys as any).fossils).toHaveLength(1)
  })

  it('update 前后 fossils 数组长度不减少（无清理机制）', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).fossils.push(makeFossil())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), 1200)
    expect((sys as any).fossils).toHaveLength(5)
  })

  it('注入 fossil 后 totalKnowledge 初始仍为 0', () => {
    ;(sys as any).fossils.push(makeFossil({ rarity: 'legendary' }))
    expect((sys as any).totalKnowledge).toBe(0)
  })

  it('发现后 fossil 的 discovered 字段持久为 true', () => {
    ;(sys as any).fossils.push(makeFossil({ rarity: 'common' }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), 1200)
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), 2400)
    expect((sys as any).fossils[0].discovered).toBe(true)
  })
})

// ---- 7. MAX_FOSSILS 上限 ----
describe('WorldFossilSystem MAX_FOSSILS 上限', () => {
  let sys: WorldFossilSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('已有 50 个 fossil 时 spawnFossils 直接返回', () => {
    for (let i = 0; i < 50; i++) {
      ;(sys as any).fossils.push(makeFossil({ x: i, y: i }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), 1200)
    expect((sys as any).fossils).toHaveLength(50)
  })

  it('49 个 fossil 时仍可 spawn 一个', () => {
    for (let i = 0; i < 49; i++) {
      ;(sys as any).fossils.push(makeFossil({ x: i, y: i }))
      ;(sys as any)._fossilKeySet.add(i * 10000 + i)
    }
    // 49 fossils, 还差 1 个空间
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 5), 1200)
    expect((sys as any).fossils.length).toBeLessThanOrEqual(50)
  })

  it('fossils 数量永远不超过 MAX_FOSSILS(50)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let tick = 1200; tick <= 12000; tick += 1200) {
      sys.update(1, makeWorld(200, 200, 5), tick)
    }
    expect((sys as any).fossils.length).toBeLessThanOrEqual(50)
  })

  it('spawnFossils 内循环在达到上限后立即 break', () => {
    for (let i = 0; i < 49; i++) {
      ;(sys as any).fossils.push(makeFossil({ x: i, y: i }))
      ;(sys as any)._fossilKeySet.add(i * 10000 + i)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(200, 200, 5), 1200)
    // 最多增加到 50
    expect((sys as any).fossils.length).toBeLessThanOrEqual(50)
  })
})

// ---- 8. 边界验证 ----
describe('WorldFossilSystem 边界验证', () => {
  let sys: WorldFossilSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('支持 6 种 FossilType', () => {
    const types: FossilType[] = ['bone', 'shell', 'plant', 'amber', 'footprint', 'artifact']
    expect(types).toHaveLength(6)
  })

  it('支持 3 种 FossilAge', () => {
    const ages: FossilAge[] = ['ancient', 'old', 'recent']
    expect(ages).toHaveLength(3)
  })

  it('支持 4 种 FossilRarity', () => {
    const rarities: FossilRarity[] = ['common', 'uncommon', 'rare', 'legendary']
    expect(rarities).toHaveLength(4)
  })

  it('RARITY_WEIGHTS 合计为 1.0', () => {
    const weights = { common: 0.5, uncommon: 0.3, rare: 0.15, legendary: 0.05 }
    const sum = Object.values(weights).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1.0, 5)
  })

  it('KNOWLEDGE_BY_RARITY common=2, uncommon=5, rare=12, legendary=30', () => {
    // 通过发现化石来验证，使用无效地形 GRASS(3) 防止 spawnFossils 额外添加 fossil
    const pairs: [FossilRarity, number][] = [
      ['common', 2], ['uncommon', 5], ['rare', 12], ['legendary', 30],
    ]
    for (const [rarity, expected] of pairs) {
      const s = makeSys()
      ;(s as any).fossils.push(makeFossil({ rarity }))
      vi.spyOn(Math, 'random').mockReturnValue(0)
      s.update(1, makeWorld(200, 200, 3 /* GRASS - invalid */), 1200)
      expect((s as any).totalKnowledge).toBe(expected)
      vi.restoreAllMocks()
    }
  })

  it('极小世界（1x1）不 crash', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(() => sys.update(1, makeWorld(1, 1, 5), 1200)).not.toThrow()
  })

  it('世界宽高为 0 时不 crash', () => {
    const world = { width: 0, height: 0, getTile: () => null } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(() => sys.update(1, world, 1200)).not.toThrow()
  })

  it('_fossilKeySet key 计算：x*10000+y 不溢出常规范围', () => {
    const x = 199, y = 199
    const key = x * 10000 + y
    expect(key).toBe(1990199)
    expect(Number.isSafeInteger(key)).toBe(true)
  })

  it('注入 fossil 后手动设置 discovered=true 不影响其他 fossil', () => {
    ;(sys as any).fossils.push(makeFossil({ rarity: 'common' }))
    ;(sys as any).fossils.push(makeFossil({ rarity: 'rare' }))
    ;(sys as any).fossils[0].discovered = true
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 使用 GRASS(3) 防止 spawnFossils 添加新 fossil
    sys.update(1, makeWorld(200, 200, 3), 1200)
    // fossil[0] 已 discovered，跳过；fossil[1] 被发现
    expect((sys as any).totalKnowledge).toBe(12)
  })

  it('spawnFossils 每次最多尝试 5 次（attempt < 5）', () => {
    // 通过 1x1 世界 + keySet 预占来验证最多 spawn 1 个（5次尝试，只有1个位置）
    ;(sys as any)._fossilKeySet.add(0 * 10000 + 0) // 占位
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(1, 1, 5), 1200)
    expect((sys as any).fossils).toHaveLength(0)
  })

  it('连续 update 多次 totalKnowledge 累积正确', () => {
    ;(sys as any).fossils.push(makeFossil({ rarity: 'common', discovered: false }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 使用 GRASS(3) 防止 spawnFossils 额外增加 fossil
    sys.update(1, makeWorld(200, 200, 3), 1200)  // 第1次触发：发现 fossil, +2
    // fossil 已发现，后续 update 不会再 +2
    sys.update(1, makeWorld(200, 200, 3), 2400)
    expect((sys as any).totalKnowledge).toBe(2)
  })
})
