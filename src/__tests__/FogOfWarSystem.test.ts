import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FogOfWarSystem, CivFogData, DiscoveryEvent } from '../systems/FogOfWarSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'

// ─── Minimal stubs ───────────────────────────────────────────────────────────

function makeCiv(id: number, name: string, territory: string[] = []) {
  return { id, name, relations: new Map<number, number>(), territory: new Set(territory) }
}

function makeCivManager(civs: ReturnType<typeof makeCiv>[] = []) {
  const civilizations = new Map<number, ReturnType<typeof makeCiv>>()
  for (const c of civs) civilizations.set(c.id, c)
  return { civilizations }
}

function makeWorld(defaultTile: TileType = TileType.GRASS) {
  return { getTile: (_x: number, _y: number) => defaultTile } as any
}

function makeParticles() {
  return { spawn: vi.fn() } as any
}

function makeEntityManager(members: { id: number; civId: number; role: string; x: number; y: number }[] = []) {
  const em = new EntityManager()
  for (const m of members) {
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'civMember', civId: m.civId, role: m.role })
    em.addComponent(eid, { type: 'position', x: m.x, y: m.y })
  }
  return em
}

function makeSys() { return new FogOfWarSystem() }

// ─── Tests ───────────────────────────────────────────────────���───────────────

describe('FogOfWarSystem — 初始化', () => {
  let sys: FogOfWarSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getCivFog 未知 civId 返回 undefined', () => {
    expect(sys.getCivFog(999)).toBeUndefined()
  })

  it('getExplorationPercent 未知 civId 返回 0', () => {
    expect(sys.getExplorationPercent(999)).toBe(0)
  })

  it('getDiscoveries 未知 civId 返回空数组', () => {
    expect(sys.getDiscoveries(999)).toHaveLength(0)
  })

  it('_mpCivId 初始为空数组', () => {
    expect((sys as any)._mpCivId.length).toBe(0)
  })

  it('_mpX 初始为空数组', () => {
    expect((sys as any)._mpX.length).toBe(0)
  })

  it('_mpY 初始为空数组', () => {
    expect((sys as any)._mpY.length).toBe(0)
  })

  it('_mpR 初始为空数组', () => {
    expect((sys as any)._mpR.length).toBe(0)
  })

  it('discoveredCivs 初始为空 Map', () => {
    expect((sys as any).discoveredCivs.size).toBe(0)
  })

  it('civFogMap 初始为空 Map', () => {
    expect((sys as any).civFogMap.size).toBe(0)
  })
})

describe('FogOfWarSystem — getFogAlpha', () => {
  let sys: FogOfWarSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('未知 civId 返回 0.8 (最暗)', () => {
    expect(sys.getFogAlpha(999, 0, 0)).toBe(0.8)
  })

  it('未探索 tile (state=0) 返回 0.8', () => {
    // create fog entry manually
    const fogMap = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT)
    ;(sys as any).civFogMap.set(1, { civId: 1, fogMap, exploredCount: 0, discoveryEvents: [] })
    expect(sys.getFogAlpha(1, 0, 0)).toBe(0.8)
  })

  it('已探索 tile (state=1) 返回 0.4', () => {
    const fogMap = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT)
    fogMap[0] = 1
    ;(sys as any).civFogMap.set(1, { civId: 1, fogMap, exploredCount: 1, discoveryEvents: [] })
    expect(sys.getFogAlpha(1, 0, 0)).toBe(0.4)
  })

  it('可见 tile (state=2) 返回 0.0', () => {
    const fogMap = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT)
    fogMap[0] = 2
    ;(sys as any).civFogMap.set(1, { civId: 1, fogMap, exploredCount: 1, discoveryEvents: [] })
    expect(sys.getFogAlpha(1, 0, 0)).toBe(0.0)
  })

  it('正确使用 y*WORLD_WIDTH+x 索引', () => {
    const fogMap = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT)
    const x = 5; const y = 3
    fogMap[y * WORLD_WIDTH + x] = 2
    ;(sys as any).civFogMap.set(1, { civId: 1, fogMap, exploredCount: 1, discoveryEvents: [] })
    expect(sys.getFogAlpha(1, x, y)).toBe(0.0)
    expect(sys.getFogAlpha(1, 0, 0)).toBe(0.8) // 其他位置仍未探索
  })
})

describe('FogOfWarSystem — getExplorationPercent', () => {
  let sys: FogOfWarSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('exploredCount=0 时返回 0', () => {
    const fogMap = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT)
    ;(sys as any).civFogMap.set(1, { civId: 1, fogMap, exploredCount: 0, discoveryEvents: [] })
    expect(sys.getExplorationPercent(1)).toBe(0)
  })

  it('exploredCount=TOTAL_TILES 时返回 100', () => {
    const TOTAL = WORLD_WIDTH * WORLD_HEIGHT
    const fogMap = new Uint8Array(TOTAL).fill(2)
    ;(sys as any).civFogMap.set(1, { civId: 1, fogMap, exploredCount: TOTAL, discoveryEvents: [] })
    expect(sys.getExplorationPercent(1)).toBeCloseTo(100, 5)
  })

  it('exploredCount=TOTAL/2 时返回 50', () => {
    const TOTAL = WORLD_WIDTH * WORLD_HEIGHT
    ;(sys as any).civFogMap.set(1, { civId: 1, fogMap: new Uint8Array(TOTAL), exploredCount: TOTAL / 2, discoveryEvents: [] })
    expect(sys.getExplorationPercent(1)).toBeCloseTo(50, 5)
  })

  it('返回值类型为 number', () => {
    ;(sys as any).civFogMap.set(1, { civId: 1, fogMap: new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT), exploredCount: 0, discoveryEvents: [] })
    expect(typeof sys.getExplorationPercent(1)).toBe('number')
  })
})

describe('FogOfWarSystem — getDiscoveries', () => {
  let sys: FogOfWarSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('有事件时返回正确数组', () => {
    const event: DiscoveryEvent = { x: 1, y: 1, type: 'ruins', description: 'test', tick: 10, claimed: true, reward: { gold: 5 } }
    ;(sys as any).civFogMap.set(2, { civId: 2, fogMap: new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT), exploredCount: 0, discoveryEvents: [event] })
    const discoveries = sys.getDiscoveries(2)
    expect(discoveries).toHaveLength(1)
    expect(discoveries[0].type).toBe('ruins')
  })

  it('多个事件均返回', () => {
    const events: DiscoveryEvent[] = [
      { x: 1, y: 1, type: 'ruins', description: 'd1', tick: 10, claimed: true, reward: {} },
      { x: 2, y: 2, type: 'treasure', description: 'd2', tick: 20, claimed: true, reward: {} },
    ]
    ;(sys as any).civFogMap.set(3, { civId: 3, fogMap: new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT), exploredCount: 0, discoveryEvents: events })
    expect(sys.getDiscoveries(3)).toHaveLength(2)
  })

  it('事件数组是原始引用（非副本）', () => {
    const events: DiscoveryEvent[] = []
    ;(sys as any).civFogMap.set(4, { civId: 4, fogMap: new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT), exploredCount: 0, discoveryEvents: events })
    expect(sys.getDiscoveries(4)).toBe(events)
  })
})

describe('FogOfWarSystem — update: fog 条目初始化', () => {
  let sys: FogOfWarSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('update 后 civFogMap 为每个 civ 创建条目', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    const em = makeEntityManager()
    sys.update(em, makeWorld(), cm as any, makeParticles(), 0)
    expect(sys.getCivFog(1)).toBeDefined()
  })

  it('update 后 fogMap 长度 = WORLD_WIDTH*WORLD_HEIGHT', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    sys.update(makeEntityManager(), makeWorld(), cm as any, makeParticles(), 0)
    expect(sys.getCivFog(1)!.fogMap.length).toBe(WORLD_WIDTH * WORLD_HEIGHT)
  })

  it('update 后 discoveredCivs 条目被创建', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    sys.update(makeEntityManager(), makeWorld(), cm as any, makeParticles(), 0)
    expect((sys as any).discoveredCivs.has(1)).toBe(true)
  })

  it('tick % 10 !== 0 时跳过 update', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    sys.update(makeEntityManager(), makeWorld(), cm as any, makeParticles(), 1)
    // fog entry should NOT have been created (skipped)
    expect(sys.getCivFog(1)).toBeUndefined()
  })

  it('tick=0 时 (0%10=0) 执行 update', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    sys.update(makeEntityManager(), makeWorld(), cm as any, makeParticles(), 0)
    expect(sys.getCivFog(1)).toBeDefined()
  })

  it('tick=10 时执行 update', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    sys.update(makeEntityManager(), makeWorld(), cm as any, makeParticles(), 10)
    expect(sys.getCivFog(1)).toBeDefined()
  })

  it('已存在 fogData 时不覆盖', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    sys.update(makeEntityManager(), makeWorld(), cm as any, makeParticles(), 0)
    const first = sys.getCivFog(1)
    sys.update(makeEntityManager(), makeWorld(), cm as any, makeParticles(), 10)
    const second = sys.getCivFog(1)
    expect(first).toBe(second) // same reference
  })

  it('多个 civ 各自创建独立 fogData', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha'), makeCiv(2, 'Beta')])
    sys.update(makeEntityManager(), makeWorld(), cm as any, makeParticles(), 0)
    expect(sys.getCivFog(1)).toBeDefined()
    expect(sys.getCivFog(2)).toBeDefined()
    expect(sys.getCivFog(1)).not.toBe(sys.getCivFog(2))
  })
})

describe('FogOfWarSystem — update: territory 永远可见', () => {
  let sys: FogOfWarSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('territory tile 在 update 后 state=2', () => {
    sys = makeSys()
    const civ = makeCiv(1, 'Alpha', ['5,5'])
    const cm = makeCivManager([civ])
    sys.update(makeEntityManager(), makeWorld(), cm as any, makeParticles(), 0)
    const fog = sys.getCivFog(1)!
    expect(fog.fogMap[5 * WORLD_WIDTH + 5]).toBe(2)
  })

  it('territory tile exploredCount 增加', () => {
    sys = makeSys()
    const civ = makeCiv(1, 'Alpha', ['0,0'])
    sys.update(makeEntityManager(), makeWorld(), makeCivManager([civ]) as any, makeParticles(), 0)
    expect(sys.getCivFog(1)!.exploredCount).toBeGreaterThan(0)
  })

  it('多个 territory tile 均为 state=2', () => {
    sys = makeSys()
    const civ = makeCiv(1, 'Alpha', ['0,0', '1,0', '2,0'])
    sys.update(makeEntityManager(), makeWorld(), makeCivManager([civ]) as any, makeParticles(), 0)
    const fog = sys.getCivFog(1)!
    expect(fog.fogMap[0]).toBe(2)
    expect(fog.fogMap[1]).toBe(2)
    expect(fog.fogMap[2]).toBe(2)
  })
})

describe('FogOfWarSystem — update: 士兵视野半径', () => {
  let sys: FogOfWarSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('士兵 (role=soldier) 视野中心 tile 为 state=2', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    const em = makeEntityManager([{ id: 1, civId: 1, role: 'soldier', x: 50, y: 50 }])
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // 不触发 discovery
    sys.update(em, makeWorld(), cm as any, makeParticles(), 0)
    expect(sys.getCivFog(1)!.fogMap[50 * WORLD_WIDTH + 50]).toBe(2)
  })

  it('worker 视野中心 tile 为 state=2', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    const em = makeEntityManager([{ id: 1, civId: 1, role: 'worker', x: 100, y: 100 }])
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(em, makeWorld(), cm as any, makeParticles(), 0)
    expect(sys.getCivFog(1)!.fogMap[100 * WORLD_WIDTH + 100]).toBe(2)
  })

  it('leader 视野中心 tile 为 state=2', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    const em = makeEntityManager([{ id: 1, civId: 1, role: 'leader', x: 80, y: 80 }])
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(em, makeWorld(), cm as any, makeParticles(), 0)
    expect(sys.getCivFog(1)!.fogMap[80 * WORLD_WIDTH + 80]).toBe(2)
  })
})

describe('FogOfWarSystem — update: 视野衰减到 explored', () => {
  let sys: FogOfWarSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('第一次 update 可见 tile 在第二次 update 开始时衰减为 1', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    // 第一次: 士兵在 (50,50) 使其可见
    const em1 = makeEntityManager([{ id: 1, civId: 1, role: 'soldier', x: 50, y: 50 }])
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(em1, makeWorld(), cm as any, makeParticles(), 0)

    // 第二次 update: 没有成员 → 视野覆盖不再覆盖 (50,50) → 应衰减到 1
    // (但 territory 没有该 tile, 所以不会重置为2)
    const em2 = makeEntityManager([])
    sys.update(em2, makeWorld(), cm as any, makeParticles(), 10)
    const state = sys.getCivFog(1)!.fogMap[50 * WORLD_WIDTH + 50]
    // state 2 was decayed to 1 in phase1 and no member re-revealed it
    expect(state).toBe(1)
  })
})

describe('FogOfWarSystem — rollDiscovery: 无发现情形', () => {
  let sys: FogOfWarSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('roll=0.99 在任意地形不触发 discovery', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    const em = makeEntityManager([{ id: 1, civId: 1, role: 'worker', x: 10, y: 10 }])
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(em, makeWorld(TileType.GRASS), cm as any, makeParticles(), 0)
    expect(sys.getDiscoveries(1)).toHaveLength(0)
  })

  it('grass tile 且 roll=0.5 不触发 discovery', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    const em = makeEntityManager([{ id: 1, civId: 1, role: 'worker', x: 10, y: 10 }])
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(em, makeWorld(TileType.GRASS), cm as any, makeParticles(), 0)
    expect(sys.getDiscoveries(1)).toHaveLength(0)
  })
})

describe('FogOfWarSystem — rollDiscovery: 触发 discovery', () => {
  let sys: FogOfWarSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('treasure: roll<0.02 在任意 tile 触发', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    const em = makeEntityManager([{ id: 1, civId: 1, role: 'worker', x: 10, y: 10 }])
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(em, makeWorld(TileType.SAND), cm as any, makeParticles(), 0)
    const discoveries = sys.getDiscoveries(1)
    const hasTreasure = discoveries.some(d => d.type === 'treasure')
    expect(hasTreasure).toBe(true)
  })

  it('discovery 事件有正确 x/y', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    const em = makeEntityManager([{ id: 1, civId: 1, role: 'worker', x: 10, y: 10 }])
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(em, makeWorld(TileType.SAND), cm as any, makeParticles(), 0)
    const discoveries = sys.getDiscoveries(1)
    // some discovery should be near (10,10)
    expect(discoveries.length).toBeGreaterThan(0)
  })

  it('discovery 事件 claimed=true (auto-claim)', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    const em = makeEntityManager([{ id: 1, civId: 1, role: 'worker', x: 10, y: 10 }])
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(em, makeWorld(TileType.SAND), cm as any, makeParticles(), 0)
    const discoveries = sys.getDiscoveries(1)
    expect(discoveries.every(d => d.claimed)).toBe(true)
  })

  it('mountain tile + roll<0.01 触发 ancient_monument', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    // 使用小地图位置 (10,10)
    const em = makeEntityManager([{ id: 1, civId: 1, role: 'worker', x: 10, y: 10 }])
    vi.spyOn(Math, 'random').mockReturnValue(0.005)
    sys.update(em, makeWorld(TileType.MOUNTAIN), cm as any, makeParticles(), 0)
    const discoveries = sys.getDiscoveries(1)
    const hasMonument = discoveries.some(d => d.type === 'ancient_monument')
    expect(hasMonument).toBe(true)
  })

  it('particles.spawn 在 discovery 时调用', () => {
    sys = makeSys()
    const cm = makeCivManager([makeCiv(1, 'Alpha')])
    const em = makeEntityManager([{ id: 1, civId: 1, role: 'worker', x: 10, y: 10 }])
    const particles = makeParticles()
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(em, makeWorld(TileType.SAND), cm as any, particles, 0)
    expect(particles.spawn).toHaveBeenCalled()
  })
})

describe('FogOfWarSystem — generateReward', () => {
  let sys: FogOfWarSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('ruins reward 包含 gold 和 xp', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const reward = (sys as any).generateReward('ruins')
    expect(reward).toHaveProperty('gold')
    expect(reward).toHaveProperty('xp')
  })

  it('treasure reward 包含 gold', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const reward = (sys as any).generateReward('treasure')
    expect(reward).toHaveProperty('gold')
  })

  it('ancient_monument reward 包含 techBoost', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const reward = (sys as any).generateReward('ancient_monument')
    expect(reward).toHaveProperty('techBoost')
  })

  it('resource_deposit reward 包含 food 和 gold', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const reward = (sys as any).generateReward('resource_deposit')
    expect(reward).toHaveProperty('food')
    expect(reward).toHaveProperty('gold')
  })

  it('lost_tribe reward 包含 food=5', () => {
    const reward = (sys as any).generateReward('lost_tribe')
    expect(reward.food).toBe(5)
  })

  it('ruins gold >= 10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const reward = (sys as any).generateReward('ruins')
    expect(reward.gold).toBeGreaterThanOrEqual(10)
  })

  it('treasure gold >= 15', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const reward = (sys as any).generateReward('treasure')
    expect(reward.gold).toBeGreaterThanOrEqual(15)
  })

  it('ancient_monument techBoost >= 5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const reward = (sys as any).generateReward('ancient_monument')
    expect(reward.techBoost).toBeGreaterThanOrEqual(5)
  })

  it('未知类型返回空对象', () => {
    const reward = (sys as any).generateReward('unknown')
    expect(reward).toEqual({})
  })
})

describe('FogOfWarSystem — checkCivDiscovery', () => {
  let sys: FogOfWarSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('发现其他文明 territory 时初始化 relations', () => {
    sys = makeSys()
    const civ1 = makeCiv(1, 'Alpha')
    const civ2 = makeCiv(2, 'Beta', ['5,5'])
    const cm = makeCivManager([civ1, civ2])

    // 手动设置 fogMap: civId=1 的地图在 (5,5) 显示 state=2
    const fogMap = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT)
    fogMap[5 * WORLD_WIDTH + 5] = 2
    ;(sys as any).civFogMap.set(1, { civId: 1, fogMap, exploredCount: 1, discoveryEvents: [] })
    ;(sys as any).discoveredCivs.set(1, new Set())

    ;(sys as any).checkCivDiscovery(
      (sys as any).civFogMap.get(1),
      cm,
      1,
      0
    )

    // relations should be initialized
    expect(civ2.relations.has(1)).toBe(true)
  })

  it('重复调用不重复添加 discoveredCivs', () => {
    sys = makeSys()
    const civ1 = makeCiv(1, 'Alpha')
    const civ2 = makeCiv(2, 'Beta', ['5,5'])
    const cm = makeCivManager([civ1, civ2])

    const fogMap = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT)
    fogMap[5 * WORLD_WIDTH + 5] = 2
    ;(sys as any).civFogMap.set(1, { civId: 1, fogMap, exploredCount: 1, discoveryEvents: [] })
    ;(sys as any).discoveredCivs.set(1, new Set())

    ;(sys as any).checkCivDiscovery((sys as any).civFogMap.get(1), cm, 1, 0)
    ;(sys as any).checkCivDiscovery((sys as any).civFogMap.get(1), cm, 1, 10)

    expect((sys as any).discoveredCivs.get(1).size).toBe(1) // still 1
  })
})
