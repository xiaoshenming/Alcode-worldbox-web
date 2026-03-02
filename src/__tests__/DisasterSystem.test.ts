import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DisasterSystem } from '../systems/DisasterSystem'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

// ---- helpers ----
function makeMockWorld(overrides: Partial<{
  getTile: (x: number, y: number) => TileType
  setTile: (x: number, y: number, t: TileType) => void
}> = {}) {
  return {
    width: 20,
    height: 20,
    tick: 0,
    getTile: overrides.getTile ?? (() => TileType.GRASS),
    setTile: overrides.setTile ?? (() => {}),
  }
}

function makeMockParticles() {
  return {
    spawnExplosion: vi.fn(),
    spawnRain: vi.fn(),
    spawn: vi.fn(),
    spawnDeath: vi.fn(),
  }
}

function makeSys(worldOverrides?: Parameters<typeof makeMockWorld>[0]) {
  const em = new EntityManager()
  const world = makeMockWorld(worldOverrides)
  const particles = makeMockParticles()
  const sys = new DisasterSystem(world as any, particles as any, em)
  return { sys, em, world, particles }
}

/** Drive the system's internal tickCounter to a multiple of 60 so trySpawnDisaster is called */
function driveToSpawnCheck(sys: DisasterSystem, times = 1) {
  for (let i = 0; i < 60 * times; i++) sys.update()
}

// ================================================================
describe('DisasterSystem — 初始状态', () => {
  afterEach(() => vi.restoreAllMocks())

  it('模块可以导入', async () => {
    const mod = await import('../systems/DisasterSystem')
    expect(mod.DisasterSystem).toBeDefined()
  })

  it('构造函数可以创建实例', () => {
    const { sys } = makeSys()
    expect(sys).toBeInstanceOf(DisasterSystem)
  })

  it('tickCounter 初始为 0', () => {
    const { sys } = makeSys()
    expect((sys as any).tickCounter).toBe(0)
  })

  it('disasters 列表初始为空', () => {
    const { sys } = makeSys()
    expect((sys as any).disasters).toHaveLength(0)
  })

  it('getActiveDisasters() 初始返回空数组', () => {
    const { sys } = makeSys()
    expect(sys.getActiveDisasters()).toHaveLength(0)
  })

  it('getActiveDisasters() 返回的是 disasters 内部数组的引用', () => {
    const { sys } = makeSys()
    expect(sys.getActiveDisasters()).toBe((sys as any).disasters)
  })
})

// ================================================================
describe('DisasterSystem — update() 基本行为', () => {
  afterEach(() => vi.restoreAllMocks())

  it('update() 空世界不崩溃', () => {
    const { sys } = makeSys()
    expect(() => sys.update()).not.toThrow()
  })

  it('update() 多次调用不崩溃', () => {
    const { sys } = makeSys()
    for (let i = 0; i < 20; i++) {
      expect(() => sys.update()).not.toThrow()
    }
  })

  it('update() 每次调用 tickCounter 递增 1', () => {
    const { sys } = makeSys()
    sys.update()
    expect((sys as any).tickCounter).toBe(1)
    sys.update()
    expect((sys as any).tickCounter).toBe(2)
  })

  it('100 次 update() 后 tickCounter 为 100', () => {
    const { sys } = makeSys()
    for (let i = 0; i < 100; i++) sys.update()
    expect((sys as any).tickCounter).toBe(100)
  })

  it('trySpawnDisaster 在 tick=60 时被调用', () => {
    const { sys } = makeSys()
    const spy = vi.spyOn(sys as any, 'trySpawnDisaster')
    for (let i = 0; i < 60; i++) sys.update()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('trySpawnDisaster 在 tick=120 时被调用两次', () => {
    const { sys } = makeSys()
    const spy = vi.spyOn(sys as any, 'trySpawnDisaster')
    for (let i = 0; i < 120; i++) sys.update()
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('trySpawnDisaster 在 tick=59 时未被调用', () => {
    const { sys } = makeSys()
    const spy = vi.spyOn(sys as any, 'trySpawnDisaster')
    for (let i = 0; i < 59; i++) sys.update()
    expect(spy).not.toHaveBeenCalled()
  })
})

// ================================================================
describe('DisasterSystem — trySpawnDisaster 概率控制', () => {
  afterEach(() => vi.restoreAllMocks())

  it('Math.random() > 0.001 时不生成灾难', () => {
    const { sys } = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    driveToSpawnCheck(sys)
    expect((sys as any).disasters).toHaveLength(0)
  })

  it('disasters >= 2 时不再生成新灾难', () => {
    const { sys } = makeSys()
    ;(sys as any).disasters.push({ type: 'volcano', x: 0, y: 0, radius: 1, maxRadius: 6, ticksLeft: 100, spreadRate: 15 })
    ;(sys as any).disasters.push({ type: 'flood',   x: 1, y: 1, radius: 1, maxRadius: 8, ticksLeft: 100, spreadRate: 20 })
    vi.spyOn(Math, 'random').mockReturnValue(0)   // pass probability check
    const spawnSpy = vi.spyOn(sys as any, 'spawnVolcano')
    driveToSpawnCheck(sys)
    expect(spawnSpy).not.toHaveBeenCalled()
  })

  it('roll < 0.35 时调用 spawnVolcano', () => {
    const { sys } = makeSys()
    // First call: pass 0.001 check, second call: roll < 0.35
    let callIdx = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callIdx++
      return callIdx === 1 ? 0 : 0.2
    })
    const spy = vi.spyOn(sys as any, 'spawnVolcano')
    driveToSpawnCheck(sys)
    expect(spy).toHaveBeenCalled()
  })

  it('0.35 <= roll < 0.7 时调用 spawnFlood', () => {
    const { sys } = makeSys()
    let callIdx = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callIdx++
      return callIdx === 1 ? 0 : 0.5
    })
    const spy = vi.spyOn(sys as any, 'spawnFlood')
    driveToSpawnCheck(sys)
    expect(spy).toHaveBeenCalled()
  })

  it('roll >= 0.7 时调用 spawnWildfire', () => {
    const { sys } = makeSys()
    let callIdx = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callIdx++
      return callIdx === 1 ? 0 : 0.9
    })
    const spy = vi.spyOn(sys as any, 'spawnWildfire')
    driveToSpawnCheck(sys)
    expect(spy).toHaveBeenCalled()
  })
})

// ================================================================
describe('DisasterSystem — spawnVolcano', () => {
  afterEach(() => vi.restoreAllMocks())

  it('找到山地时新增 volcano 灾难', () => {
    const { sys } = makeSys({ getTile: () => TileType.MOUNTAIN })
    vi.spyOn(Math, 'random').mockReturnValue(0)   // x=0,y=0 both floor to 0
    ;(sys as any).spawnVolcano()
    expect((sys as any).disasters).toHaveLength(1)
    expect((sys as any).disasters[0].type).toBe('volcano')
  })

  it('volcano 灾难的 maxRadius 为 6', () => {
    const { sys } = makeSys({ getTile: () => TileType.MOUNTAIN })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnVolcano()
    expect((sys as any).disasters[0].maxRadius).toBe(6)
  })

  it('volcano 灾难的 ticksLeft 为 600', () => {
    const { sys } = makeSys({ getTile: () => TileType.MOUNTAIN })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnVolcano()
    expect((sys as any).disasters[0].ticksLeft).toBe(600)
  })

  it('volcano 灾难的 spreadRate 为 15', () => {
    const { sys } = makeSys({ getTile: () => TileType.MOUNTAIN })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnVolcano()
    expect((sys as any).disasters[0].spreadRate).toBe(15)
  })

  it('找不到山地时不新增灾难（全草地）', () => {
    const { sys } = makeSys({ getTile: () => TileType.GRASS })
    ;(sys as any).spawnVolcano()
    expect((sys as any).disasters).toHaveLength(0)
  })

  it('找到山地时 particles.spawnExplosion 被调用', () => {
    const { sys, particles } = makeSys({ getTile: () => TileType.MOUNTAIN })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnVolcano()
    expect(particles.spawnExplosion).toHaveBeenCalled()
  })

  it('找到山地时将该 tile 设置为 LAVA', () => {
    const setTileSpy = vi.fn()
    const { sys } = makeSys({ getTile: () => TileType.MOUNTAIN, setTile: setTileSpy })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnVolcano()
    expect(setTileSpy).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), TileType.LAVA)
  })
})

// ================================================================
describe('DisasterSystem — spawnFlood', () => {
  afterEach(() => vi.restoreAllMocks())

  it('找到 SHALLOW_WATER 且相邻有水时新增 flood 灾难', () => {
    // grid: target tile is SHALLOW_WATER, neighbors have SHALLOW_WATER
    const { sys } = makeSys({ getTile: () => TileType.SHALLOW_WATER })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnFlood()
    expect((sys as any).disasters).toHaveLength(1)
    expect((sys as any).disasters[0].type).toBe('flood')
  })

  it('flood 灾难的 maxRadius 为 8', () => {
    const { sys } = makeSys({ getTile: () => TileType.SHALLOW_WATER })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnFlood()
    expect((sys as any).disasters[0].maxRadius).toBe(8)
  })

  it('flood 灾难的 ticksLeft 为 500', () => {
    const { sys } = makeSys({ getTile: () => TileType.SHALLOW_WATER })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnFlood()
    expect((sys as any).disasters[0].ticksLeft).toBe(500)
  })

  it('flood 灾难的 spreadRate 为 20', () => {
    const { sys } = makeSys({ getTile: () => TileType.SHALLOW_WATER })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnFlood()
    expect((sys as any).disasters[0].spreadRate).toBe(20)
  })

  it('全草地（无水）时 spawnFlood 不新增灾难', () => {
    const { sys } = makeSys({ getTile: () => TileType.GRASS })
    ;(sys as any).spawnFlood()
    expect((sys as any).disasters).toHaveLength(0)
  })

  it('找到合适位置时 particles.spawnRain 被调用', () => {
    const { sys, particles } = makeSys({ getTile: () => TileType.SHALLOW_WATER })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnFlood()
    expect(particles.spawnRain).toHaveBeenCalled()
  })
})

// ================================================================
describe('DisasterSystem — spawnWildfire', () => {
  afterEach(() => vi.restoreAllMocks())

  it('找到 FOREST 时新增 wildfire 灾难', () => {
    const { sys } = makeSys({ getTile: () => TileType.FOREST })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnWildfire()
    expect((sys as any).disasters).toHaveLength(1)
    expect((sys as any).disasters[0].type).toBe('wildfire')
  })

  it('wildfire 灾难的 maxRadius 为 10', () => {
    const { sys } = makeSys({ getTile: () => TileType.FOREST })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnWildfire()
    expect((sys as any).disasters[0].maxRadius).toBe(10)
  })

  it('wildfire 灾难的 ticksLeft 为 400', () => {
    const { sys } = makeSys({ getTile: () => TileType.FOREST })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnWildfire()
    expect((sys as any).disasters[0].ticksLeft).toBe(400)
  })

  it('wildfire 灾难的 spreadRate 为 10', () => {
    const { sys } = makeSys({ getTile: () => TileType.FOREST })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnWildfire()
    expect((sys as any).disasters[0].spreadRate).toBe(10)
  })

  it('找到 FOREST 时将该 tile 设置为 SAND', () => {
    const setTileSpy = vi.fn()
    const { sys } = makeSys({ getTile: () => TileType.FOREST, setTile: setTileSpy })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).spawnWildfire()
    expect(setTileSpy).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), TileType.SAND)
  })

  it('全草地（无森林）时 spawnWildfire 不新增灾难', () => {
    const { sys } = makeSys({ getTile: () => TileType.GRASS })
    ;(sys as any).spawnWildfire()
    expect((sys as any).disasters).toHaveLength(0)
  })
})

// ================================================================
describe('DisasterSystem — 灾难过期与清理', () => {
  afterEach(() => vi.restoreAllMocks())

  it('ticksLeft <= 0 的灾难在 update() 后被移除', () => {
    const { sys } = makeSys()
    ;(sys as any).disasters.push({
      type: 'wildfire', x: 5, y: 5, radius: 1, maxRadius: 10, ticksLeft: 1, spreadRate: 999
    })
    sys.update()   // ticksLeft becomes 0 → removed
    expect((sys as any).disasters).toHaveLength(0)
  })

  it('ticksLeft > 0 的灾难保持存活', () => {
    const { sys } = makeSys()
    ;(sys as any).disasters.push({
      type: 'wildfire', x: 5, y: 5, radius: 1, maxRadius: 10, ticksLeft: 50, spreadRate: 999
    })
    sys.update()
    expect((sys as any).disasters).toHaveLength(1)
  })

  it('每次 update 灾难的 ticksLeft 减少 1', () => {
    const { sys } = makeSys()
    ;(sys as any).disasters.push({
      type: 'volcano', x: 5, y: 5, radius: 1, maxRadius: 6, ticksLeft: 100, spreadRate: 999
    })
    sys.update()
    expect((sys as any).disasters[0].ticksLeft).toBe(99)
  })

  it('多个灾难同时过期时都被清除', () => {
    const { sys } = makeSys()
    ;(sys as any).disasters.push(
      { type: 'volcano',   x: 1, y: 1, radius: 1, maxRadius: 6,  ticksLeft: 1, spreadRate: 999 },
      { type: 'flood',     x: 2, y: 2, radius: 1, maxRadius: 8,  ticksLeft: 1, spreadRate: 999 },
      { type: 'wildfire',  x: 3, y: 3, radius: 1, maxRadius: 10, ticksLeft: 1, spreadRate: 999 },
    )
    sys.update()
    expect((sys as any).disasters).toHaveLength(0)
  })
})

// ================================================================
describe('DisasterSystem — spreadVolcano', () => {
  afterEach(() => vi.restoreAllMocks())

  it('radius >= maxRadius 时不改变 tiles', () => {
    const setTileSpy = vi.fn()
    const { sys } = makeSys({ setTile: setTileSpy })
    const d = { type: 'volcano' as const, x: 10, y: 10, radius: 6, maxRadius: 6, ticksLeft: 100, spreadRate: 15 }
    ;(sys as any).spreadVolcano(d)
    expect(setTileSpy).not.toHaveBeenCalled()
  })

  it('radius < maxRadius 时 radius 增加 0.5', () => {
    const { sys } = makeSys()
    const d = { type: 'volcano' as const, x: 10, y: 10, radius: 1, maxRadius: 6, ticksLeft: 100, spreadRate: 15 }
    vi.spyOn(Math, 'random').mockReturnValue(1)  // never set tile (< 0.5 check)
    ;(sys as any).spreadVolcano(d)
    expect(d.radius).toBeCloseTo(1.5)
  })

  it('spreadVolcano 中 Math.random < 0.5 且 r <= maxRadius*0.4 时设置 LAVA', () => {
    const setTileSpy = vi.fn()
    // getTile returns GRASS (not skipped)
    const { sys } = makeSys({ getTile: () => TileType.GRASS, setTile: setTileSpy })
    vi.spyOn(Math, 'random').mockReturnValue(0)  // always < 0.5 → sets tile; r=1, maxRadius*0.4=2.4 → LAVA
    const d = { type: 'volcano' as const, x: 10, y: 10, radius: 1, maxRadius: 6, ticksLeft: 100, spreadRate: 15 }
    ;(sys as any).spreadVolcano(d)
    // At least one LAVA set call
    expect(setTileSpy).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), TileType.LAVA)
  })

  it('particles.spawnExplosion 在 spreadVolcano 中被调用', () => {
    const { sys, particles } = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)  // skip tile setting
    const d = { type: 'volcano' as const, x: 10, y: 10, radius: 1, maxRadius: 6, ticksLeft: 100, spreadRate: 15 }
    ;(sys as any).spreadVolcano(d)
    expect(particles.spawnExplosion).toHaveBeenCalledWith(10, 10)
  })

  it('LAVA tile 被跳过（不��再次设置）', () => {
    const setTileSpy = vi.fn()
    const { sys } = makeSys({ getTile: () => TileType.LAVA, setTile: setTileSpy })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const d = { type: 'volcano' as const, x: 10, y: 10, radius: 1, maxRadius: 6, ticksLeft: 100, spreadRate: 15 }
    ;(sys as any).spreadVolcano(d)
    expect(setTileSpy).not.toHaveBeenCalled()
  })

  it('DEEP_WATER tile 被跳过', () => {
    const setTileSpy = vi.fn()
    const { sys } = makeSys({ getTile: () => TileType.DEEP_WATER, setTile: setTileSpy })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const d = { type: 'volcano' as const, x: 10, y: 10, radius: 1, maxRadius: 6, ticksLeft: 100, spreadRate: 15 }
    ;(sys as any).spreadVolcano(d)
    expect(setTileSpy).not.toHaveBeenCalled()
  })
})

// ================================================================
describe('DisasterSystem — spreadWildfire', () => {
  afterEach(() => vi.restoreAllMocks())

  it('radius >= maxRadius 时不扩展', () => {
    const setTileSpy = vi.fn()
    const { sys } = makeSys({ setTile: setTileSpy })
    const d = { type: 'wildfire' as const, x: 5, y: 5, radius: 10, maxRadius: 10, ticksLeft: 100, spreadRate: 10 }
    ;(sys as any).spreadWildfire(d)
    expect(setTileSpy).not.toHaveBeenCalled()
  })

  it('FOREST tile 且 random < 0.2 时被设置为 SAND', () => {
    const setTileSpy = vi.fn()
    const { sys } = makeSys({ getTile: () => TileType.FOREST, setTile: setTileSpy })
    vi.spyOn(Math, 'random').mockReturnValue(0)  // always < 0.2
    const d = { type: 'wildfire' as const, x: 5, y: 5, radius: 1, maxRadius: 10, ticksLeft: 100, spreadRate: 10 }
    ;(sys as any).spreadWildfire(d)
    expect(setTileSpy).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), TileType.SAND)
  })

  it('无可燃物时 ticksLeft 额外减少 20', () => {
    const { sys } = makeSys({ getTile: () => TileType.DEEP_WATER })
    const d = { type: 'wildfire' as const, x: 5, y: 5, radius: 1, maxRadius: 10, ticksLeft: 100, spreadRate: 10 }
    ;(sys as any).spreadWildfire(d)
    // ticksLeft is not directly touched in spreadWildfire unless no spread
    expect(d.ticksLeft).toBe(80)  // 100 - 20
  })

  it('有蔓延时 ticksLeft 不额外减少', () => {
    const { sys } = makeSys({ getTile: () => TileType.FOREST })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const d = { type: 'wildfire' as const, x: 5, y: 5, radius: 1, maxRadius: 10, ticksLeft: 100, spreadRate: 10 }
    ;(sys as any).spreadWildfire(d)
    expect(d.ticksLeft).toBe(100)  // not decremented extra
  })

  it('radius 每次 spread 增加 0.4', () => {
    const { sys } = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const d = { type: 'wildfire' as const, x: 5, y: 5, radius: 1, maxRadius: 10, ticksLeft: 100, spreadRate: 10 }
    ;(sys as any).spreadWildfire(d)
    expect(d.radius).toBeCloseTo(1.4)
  })
})

// ================================================================
describe('DisasterSystem — spreadFlood', () => {
  afterEach(() => vi.restoreAllMocks())

  it('radius >= maxRadius 时不扩展', () => {
    const setTileSpy = vi.fn()
    const { sys } = makeSys({ setTile: setTileSpy })
    const d = { type: 'flood' as const, x: 5, y: 5, radius: 8, maxRadius: 8, ticksLeft: 100, spreadRate: 20 }
    ;(sys as any).spreadFlood(d)
    expect(setTileSpy).not.toHaveBeenCalled()
  })

  it('SAND tile 且 random < 0.15 时变为 SHALLOW_WATER', () => {
    const setTileSpy = vi.fn()
    const { sys } = makeSys({ getTile: () => TileType.SAND, setTile: setTileSpy })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const d = { type: 'flood' as const, x: 5, y: 5, radius: 1, maxRadius: 8, ticksLeft: 100, spreadRate: 20 }
    ;(sys as any).spreadFlood(d)
    expect(setTileSpy).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), TileType.SHALLOW_WATER)
  })

  it('FOREST tile 且 random < 0.15 时变为 GRASS', () => {
    const setTileSpy = vi.fn()
    const { sys } = makeSys({ getTile: () => TileType.FOREST, setTile: setTileSpy })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const d = { type: 'flood' as const, x: 5, y: 5, radius: 1, maxRadius: 8, ticksLeft: 100, spreadRate: 20 }
    ;(sys as any).spreadFlood(d)
    expect(setTileSpy).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), TileType.GRASS)
  })

  it('MOUNTAIN tile 被跳过（不受洪水影响）', () => {
    const setTileSpy = vi.fn()
    const { sys } = makeSys({ getTile: () => TileType.MOUNTAIN, setTile: setTileSpy })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const d = { type: 'flood' as const, x: 5, y: 5, radius: 1, maxRadius: 8, ticksLeft: 100, spreadRate: 20 }
    ;(sys as any).spreadFlood(d)
    expect(setTileSpy).not.toHaveBeenCalled()
  })

  it('radius 每次 spreadFlood 增加 0.3', () => {
    const { sys } = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const d = { type: 'flood' as const, x: 5, y: 5, radius: 1, maxRadius: 8, ticksLeft: 100, spreadRate: 20 }
    ;(sys as any).spreadFlood(d)
    expect(d.radius).toBeCloseTo(1.3)
  })
})

// ================================================================
describe('DisasterSystem — killAt', () => {
  afterEach(() => vi.restoreAllMocks())

  it('killAt 对范围内实体有 40% 概率移除', () => {
    const { sys, em } = makeSys()
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: 5, y: 5 })
    vi.spyOn(Math, 'random').mockReturnValue(0)  // always < 0.4 → remove
    ;(sys as any).killAt(5, 5)
    expect(em.getEntitiesWithComponent('position')).not.toContain(id)
  })

  it('killAt random >= 0.4 时实体存活', () => {
    const { sys, em } = makeSys()
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: 5, y: 5 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)  // >= 0.4 → keep
    ;(sys as any).killAt(5, 5)
    expect(em.getEntitiesWithComponent('position')).toContain(id)
  })

  it('killAt 对远处实体无效（距离 >= 2）', () => {
    const { sys, em } = makeSys()
    const id = em.createEntity()
    em.addComponent(id, { type: 'position', x: 10, y: 10 })
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).killAt(5, 5)  // distance = 5√2 >> 2
    expect(em.getEntitiesWithComponent('position')).toContain(id)
  })

  it('killAt 无实体时不崩溃', () => {
    const { sys } = makeSys()
    expect(() => (sys as any).killAt(5, 5)).not.toThrow()
  })
})

// ================================================================
describe('DisasterSystem — hasAdjacentTile', () => {
  afterEach(() => vi.restoreAllMocks())

  it('上方邻居匹配时返回 true', () => {
    let callCount = 0
    const { sys } = makeSys({
      getTile: (x, y) => (callCount++ === 0 && y === 4 ? TileType.DEEP_WATER : TileType.GRASS),
    })
    // Simulate by injecting a getTile that returns DEEP_WATER for (5,4)
    const world = (sys as any).world
    world.getTile = (x: number, y: number) => (x === 5 && y === 4 ? TileType.DEEP_WATER : TileType.GRASS)
    const result = (sys as any).hasAdjacentTile(5, 5, TileType.DEEP_WATER)
    expect(result).toBe(true)
  })

  it('无匹配邻居时返回 false', () => {
    const { sys } = makeSys({ getTile: () => TileType.GRASS })
    const result = (sys as any).hasAdjacentTile(5, 5, TileType.DEEP_WATER)
    expect(result).toBe(false)
  })

  it('边界坐标（x=0,y=0）不崩溃', () => {
    const { sys } = makeSys()
    expect(() => (sys as any).hasAdjacentTile(0, 0, TileType.DEEP_WATER)).not.toThrow()
  })
})

// ================================================================
describe('DisasterSystem — 并发灾难上限', () => {
  afterEach(() => vi.restoreAllMocks())

  it('已有 2 个灾难时 getActiveDisasters 长度为 2', () => {
    const { sys } = makeSys()
    ;(sys as any).disasters.push(
      { type: 'volcano',  x: 0, y: 0, radius: 1, maxRadius: 6,  ticksLeft: 100, spreadRate: 15 },
      { type: 'wildfire', x: 1, y: 1, radius: 1, maxRadius: 10, ticksLeft: 100, spreadRate: 10 },
    )
    expect(sys.getActiveDisasters()).toHaveLength(2)
  })

  it('同时存在三种类型灾难可以直接注入', () => {
    const { sys } = makeSys()
    ;(sys as any).disasters.push(
      { type: 'volcano',  x: 0, y: 0, radius: 1, maxRadius: 6,  ticksLeft: 10, spreadRate: 999 },
      { type: 'flood',    x: 1, y: 1, radius: 1, maxRadius: 8,  ticksLeft: 10, spreadRate: 999 },
      { type: 'wildfire', x: 2, y: 2, radius: 1, maxRadius: 10, ticksLeft: 10, spreadRate: 999 },
    )
    expect(sys.getActiveDisasters()).toHaveLength(3)
  })

  it('spread 仅在 tickCounter % spreadRate === 0 时触发', () => {
    const { sys } = makeSys()
    const d = { type: 'wildfire' as const, x: 5, y: 5, radius: 1, maxRadius: 10, ticksLeft: 999, spreadRate: 10 }
    ;(sys as any).disasters.push(d)
    const spreadSpy = vi.spyOn(sys as any, 'spreadWildfire')

    // Run exactly 10 updates (tickCounter goes 1..10); spread only when tickCounter%10===0 → at tick 10
    for (let i = 0; i < 10; i++) sys.update()
    expect(spreadSpy).toHaveBeenCalledTimes(1)
  })
})
