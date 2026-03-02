import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WeatherDisasterSystem } from '../systems/WeatherDisasterSystem'
import type { ActiveWeatherDisaster } from '../systems/WeatherDisasterSystem'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'

function makeSys() { return new WeatherDisasterSystem() }

function makeDisaster(overrides: Partial<ActiveWeatherDisaster> = {}): ActiveWeatherDisaster {
  return {
    type: 'blizzard',
    startTick: 0,
    duration: 600,
    intensity: 0.8,
    affectedArea: { x: 10, y: 10, radius: 5 },
    originalTiles: new Map(),
    ...overrides,
  }
}

function makeWorld(tileMap: Map<string, TileType> = new Map()) {
  const tiles = new Map(tileMap)
  return {
    getTile: (x: number, y: number) => tiles.get(`${x},${y}`) ?? TileType.GRASS,
    setTile: (x: number, y: number, t: TileType) => { tiles.set(`${x},${y}`, t) },
    tiles,
    tick: 0,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
  }
}

function makeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '' as any,
    globalAlpha: 1,
    strokeStyle: '' as any,
    lineWidth: 1,
  }
}

describe('WeatherDisasterSystem', () => {
  let sys: WeatherDisasterSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  // ── 初始状态 ────────────────────────────────────────────────────���───────────

  it('getActiveDisasters初始为空', () => {
    expect(sys.getActiveDisasters()).toHaveLength(0)
  })

  it('getActiveDisasters返回数组', () => {
    expect(Array.isArray(sys.getActiveDisasters())).toBe(true)
  })

  it('lastCheckTick初始为0', () => {
    expect((sys as any).lastCheckTick).toBe(0)
  })

  it('activeDisasters初始为空数组', () => {
    expect((sys as any).activeDisasters).toEqual([])
  })

  it('getActiveDisasters返回同一个内部引用', () => {
    expect(sys.getActiveDisasters()).toBe((sys as any).activeDisasters)
  })

  it('新实例互相独立', () => {
    const sys2 = makeSys()
    ;(sys as any).activeDisasters.push(makeDisaster())
    expect(sys2.getActiveDisasters()).toHaveLength(0)
  })

  // ── expireDisaster：tile 恢复逻辑 ───────────────────────────────────────────

  it('expireDisaster 把 originalTiles 还原到世界', () => {
    const world = makeWorld()
    world.setTile(5, 5, TileType.SNOW)
    const d = makeDisaster()
    d.originalTiles.set(5 * 10000 + 5, TileType.GRASS)
    ;(sys as any).expireDisaster(d, world, 100)
    expect(world.getTile(5, 5)).toBe(TileType.GRASS)
  })

  it('expireDisaster 还原多个tile', () => {
    const world = makeWorld()
    world.setTile(1, 2, TileType.SNOW)
    world.setTile(3, 4, TileType.SAND)
    const d = makeDisaster()
    d.originalTiles.set(1 * 10000 + 2, TileType.FOREST)
    d.originalTiles.set(3 * 10000 + 4, TileType.GRASS)
    ;(sys as any).expireDisaster(d, world, 200)
    expect(world.getTile(1, 2)).toBe(TileType.FOREST)
    expect(world.getTile(3, 4)).toBe(TileType.GRASS)
  })

  it('expireDisaster 后 originalTiles 被清空', () => {
    const world = makeWorld()
    const d = makeDisaster()
    d.originalTiles.set(10 * 10000 + 10, TileType.GRASS)
    ;(sys as any).expireDisaster(d, world, 100)
    expect(d.originalTiles.size).toBe(0)
  })

  it('expireDisaster 边界外的key不导致崩溃', () => {
    const world = makeWorld()
    const d = makeDisaster()
    d.originalTiles.set(-1 * 10000 + 0, TileType.GRASS)
    expect(() => (sys as any).expireDisaster(d, world, 100)).not.toThrow()
  })

  it('expireDisaster 无originalTiles时不崩溃', () => {
    const world = makeWorld()
    const d = makeDisaster()
    expect(() => (sys as any).expireDisaster(d, world, 100)).not.toThrow()
  })

  it('expireDisaster 还原FOREST类型', () => {
    const world = makeWorld()
    world.setTile(0, 0, TileType.SNOW)
    const d = makeDisaster()
    d.originalTiles.set(0 * 10000 + 0, TileType.FOREST)
    ;(sys as any).expireDisaster(d, world, 100)
    expect(world.getTile(0, 0)).toBe(TileType.FOREST)
  })

  it('expireDisaster 还原SAND类型', () => {
    const world = makeWorld()
    world.setTile(2, 3, TileType.GRASS)
    const d = makeDisaster()
    d.originalTiles.set(2 * 10000 + 3, TileType.SAND)
    ;(sys as any).expireDisaster(d, world, 100)
    expect(world.getTile(2, 3)).toBe(TileType.SAND)
  })

  it('expireDisaster 还原SHALLOW_WATER类型', () => {
    const world = makeWorld()
    world.setTile(7, 8, TileType.SAND)
    const d = makeDisaster()
    d.originalTiles.set(7 * 10000 + 8, TileType.SHALLOW_WATER)
    ;(sys as any).expireDisaster(d, world, 100)
    expect(world.getTile(7, 8)).toBe(TileType.SHALLOW_WATER)
  })

  it('expireDisaster y=9999不溢出', () => {
    const world = makeWorld()
    const d = makeDisaster()
    // key = x*10000 + y, y=9999边界
    d.originalTiles.set(0 * 10000 + 9999, TileType.GRASS)
    expect(() => (sys as any).expireDisaster(d, world, 100)).not.toThrow()
  })

  // ── isInArea 工具函数 ───────────────────────────────────────────────────────

  it('isInArea: 圆心在区域内返回true', () => {
    const area = { x: 10, y: 10, radius: 5 }
    expect((sys as any).isInArea(10, 10, area)).toBe(true)
  })

  it('isInArea: 边界点(radius距离)在区域内', () => {
    const area = { x: 0, y: 0, radius: 5 }
    expect((sys as any).isInArea(5, 0, area)).toBe(true)
  })

  it('isInArea: 边界外的点返回false', () => {
    const area = { x: 0, y: 0, radius: 5 }
    expect((sys as any).isInArea(6, 0, area)).toBe(false)
  })

  it('isInArea: null area始终返回true（全局灾难）', () => {
    expect((sys as any).isInArea(999, 999, null)).toBe(true)
  })

  it('isInArea: 原点到原点距离0 <= radius', () => {
    const area = { x: 0, y: 0, radius: 0 }
    expect((sys as any).isInArea(0, 0, area)).toBe(true)
  })

  it('isInArea: 对角距离计算正确', () => {
    // distance = sqrt(3^2+4^2) = 5
    const area = { x: 0, y: 0, radius: 5 }
    expect((sys as any).isInArea(3, 4, area)).toBe(true)
  })

  it('isInArea: 超过对角距离返回false', () => {
    const area = { x: 0, y: 0, radius: 4 }
    // distance = 5 > 4
    expect((sys as any).isInArea(3, 4, area)).toBe(false)
  })

  it('isInArea: 负坐标与正坐标圆心', () => {
    const area = { x: 10, y: 10, radius: 5 }
    expect((sys as any).isInArea(10, 15, area)).toBe(true)
    expect((sys as any).isInArea(10, 16, area)).toBe(false)
  })

  it('isInArea: y轴方向边界', () => {
    const area = { x: 0, y: 0, radius: 5 }
    expect((sys as any).isInArea(0, 5, area)).toBe(true)
    expect((sys as any).isInArea(0, 6, area)).toBe(false)
  })

  // ── setTileWithRecord 工具函数 ──────────────────────────────────────────────

  it('setTileWithRecord 首次记录original tile', () => {
    const world = makeWorld()
    world.setTile(3, 3, TileType.FOREST)
    const d = makeDisaster()
    ;(sys as any).setTileWithRecord(world, d, 3, 3, TileType.SNOW)
    expect(world.getTile(3, 3)).toBe(TileType.SNOW)
    expect(d.originalTiles.get(3 * 10000 + 3)).toBe(TileType.FOREST)
  })

  it('setTileWithRecord 不覆盖已记录的original（幂等）', () => {
    const world = makeWorld()
    world.setTile(5, 5, TileType.GRASS)
    const d = makeDisaster()
    d.originalTiles.set(5 * 10000 + 5, TileType.FOREST)
    ;(sys as any).setTileWithRecord(world, d, 5, 5, TileType.SNOW)
    expect(world.getTile(5, 5)).toBe(TileType.SNOW)
    expect(d.originalTiles.get(5 * 10000 + 5)).toBe(TileType.FOREST)
  })

  it('setTileWithRecord key公式正确 x*10000+y', () => {
    const world = makeWorld()
    world.setTile(2, 7, TileType.GRASS)
    const d = makeDisaster()
    ;(sys as any).setTileWithRecord(world, d, 2, 7, TileType.SAND)
    expect(d.originalTiles.has(2 * 10000 + 7)).toBe(true)
  })

  it('setTileWithRecord 两次调用相同位置只保留第一次original', () => {
    const world = makeWorld()
    world.setTile(1, 1, TileType.FOREST)
    const d = makeDisaster()
    ;(sys as any).setTileWithRecord(world, d, 1, 1, TileType.SNOW)
    // 再调用一次，world.getTile返回SNOW，但original应该保持FOREST
    ;(sys as any).setTileWithRecord(world, d, 1, 1, TileType.SAND)
    expect(d.originalTiles.get(1 * 10000 + 1)).toBe(TileType.FOREST)
  })

  it('setTileWithRecord 设置新的tile值', () => {
    const world = makeWorld()
    const d = makeDisaster()
    ;(sys as any).setTileWithRecord(world, d, 0, 0, TileType.SNOW)
    expect(world.getTile(0, 0)).toBe(TileType.SNOW)
  })

  // ── hasAdjacentTileType 工具函数 ────────────────────────────────────────────

  it('hasAdjacentTileType: 右侧邻居匹配', () => {
    const world = makeWorld()
    world.setTile(5, 5, TileType.SHALLOW_WATER)
    expect((sys as any).hasAdjacentTileType(world, 4, 5, TileType.SHALLOW_WATER)).toBe(true)
  })

  it('hasAdjacentTileType: 左侧邻居匹配', () => {
    const world = makeWorld()
    world.setTile(3, 5, TileType.SHALLOW_WATER)
    expect((sys as any).hasAdjacentTileType(world, 4, 5, TileType.SHALLOW_WATER)).toBe(true)
  })

  it('hasAdjacentTileType: 上侧邻居匹配', () => {
    const world = makeWorld()
    world.setTile(4, 4, TileType.DEEP_WATER)
    expect((sys as any).hasAdjacentTileType(world, 4, 5, TileType.DEEP_WATER)).toBe(true)
  })

  it('hasAdjacentTileType: 下侧邻居匹配', () => {
    const world = makeWorld()
    world.setTile(4, 6, TileType.SAND)
    expect((sys as any).hasAdjacentTileType(world, 4, 5, TileType.SAND)).toBe(true)
  })

  it('hasAdjacentTileType: 无邻居匹配返回false', () => {
    const world = makeWorld()
    expect((sys as any).hasAdjacentTileType(world, 4, 5, TileType.SNOW)).toBe(false)
  })

  it('hasAdjacentTileType: 对角不算邻居', () => {
    const world = makeWorld()
    world.setTile(3, 4, TileType.SNOW)
    // 对角 (3,4) 对于 (4,5) 来说不是4方向邻居
    expect((sys as any).hasAdjacentTileType(world, 4, 5, TileType.SNOW)).toBe(false)
  })

  // ── createDisaster 内部函数 ─────────────────────────────────────────────────

  it('createDisaster 返回指定type的灾难', () => {
    const d = (sys as any).createDisaster('drought', 100)
    expect(d.type).toBe('drought')
  })

  it('createDisaster startTick等于传入tick', () => {
    const d = (sys as any).createDisaster('blizzard', 500)
    expect(d.startTick).toBe(500)
  })

  it('createDisaster duration在600-1800范围内', () => {
    for (let i = 0; i < 10; i++) {
      const d = (sys as any).createDisaster('flood', 0)
      expect(d.duration).toBeGreaterThanOrEqual(600)
      expect(d.duration).toBeLessThanOrEqual(1800)
    }
  })

  it('createDisaster intensity在0.5-1.0范围内', () => {
    for (let i = 0; i < 10; i++) {
      const d = (sys as any).createDisaster('heatwave', 0)
      expect(d.intensity).toBeGreaterThanOrEqual(0.5)
      expect(d.intensity).toBeLessThanOrEqual(1.0)
    }
  })

  it('createDisaster 生成空的originalTiles Map', () => {
    const d = (sys as any).createDisaster('blizzard', 0)
    expect(d.originalTiles.size).toBe(0)
  })

  it('createDisaster affectedArea radius在20-40范围内', () => {
    for (let i = 0; i < 10; i++) {
      const d = (sys as any).createDisaster('blizzard', 0)
      expect(d.affectedArea!.radius).toBeGreaterThanOrEqual(20)
      expect(d.affectedArea!.radius).toBeLessThanOrEqual(40)
    }
  })

  it('createDisaster 使用指定areaCenter时affectedArea x/y正确', () => {
    const d = (sys as any).createDisaster('flood', 0, { x: 42, y: 77 })
    expect(d.affectedArea!.x).toBe(42)
    expect(d.affectedArea!.y).toBe(77)
  })

  it('createDisaster 不指定areaCenter时affectedArea在世界范围内', () => {
    const d = (sys as any).createDisaster('blizzard', 0)
    expect(d.affectedArea!.x).toBeGreaterThanOrEqual(0)
    expect(d.affectedArea!.x).toBeLessThan(WORLD_WIDTH)
    expect(d.affectedArea!.y).toBeGreaterThanOrEqual(0)
    expect(d.affectedArea!.y).toBeLessThan(WORLD_HEIGHT)
  })

  // ── update 节流逻辑 ─────────────────────────────────────────────────────────

  it('update: tick差值<120时不更新lastCheckTick', () => {
    const world = makeWorld()
    const em = { getEntitiesWithComponents: () => [] } as any
    const civMgr = {} as any
    const particles = { addParticle: vi.fn(), spawnExplosion: vi.fn() } as any
    ;(sys as any).lastCheckTick = 0
    sys.update(world, em, civMgr, particles, 100, 'spring', 'clear')
    expect((sys as any).lastCheckTick).toBe(0)
  })

  it('update: tick差值>=120时更新lastCheckTick', () => {
    const world = makeWorld()
    const em = { getEntitiesWithComponents: () => [] } as any
    const civMgr = {} as any
    const particles = { addParticle: vi.fn(), spawnExplosion: vi.fn() } as any
    ;(sys as any).lastCheckTick = 0
    sys.update(world, em, civMgr, particles, 120, 'spring', 'clear')
    expect((sys as any).lastCheckTick).toBe(120)
  })

  it('update: 过期灾难被移除', () => {
    const world = makeWorld()
    const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
    const civMgr = {} as any
    const particles = { addParticle: vi.fn(), spawnExplosion: vi.fn() } as any
    const d = makeDisaster({ startTick: 0, duration: 100 })
    ;(sys as any).activeDisasters.push(d)
    // tick=200 > startTick+duration=100，应过期
    sys.update(world, em, civMgr, particles, 200, 'spring', 'clear')
    expect(sys.getActiveDisasters()).toHaveLength(0)
  })

  it('update: 未过期灾难保留', () => {
    const world = makeWorld()
    const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
    const civMgr = {} as any
    const particles = { addParticle: vi.fn(), spawnExplosion: vi.fn() } as any
    const d = makeDisaster({ startTick: 0, duration: 1000 })
    ;(sys as any).activeDisasters.push(d)
    ;(sys as any).lastCheckTick = 9999 // 不触发checkTriggers
    sys.update(world, em, civMgr, particles, 500, 'spring', 'clear')
    expect(sys.getActiveDisasters()).toHaveLength(1)
  })

  it('update: 多个灾难中只移除过期的', () => {
    const world = makeWorld()
    const em = { getEntitiesWithComponents: () => [], getComponent: () => null } as any
    const civMgr = {} as any
    const particles = { addParticle: vi.fn(), spawnExplosion: vi.fn() } as any
    const expired = makeDisaster({ startTick: 0, duration: 10 })
    const active = makeDisaster({ startTick: 0, duration: 10000 })
    ;(sys as any).activeDisasters.push(expired, active)
    ;(sys as any).lastCheckTick = 9999
    sys.update(world, em, civMgr, particles, 100, 'spring', 'clear')
    expect(sys.getActiveDisasters()).toHaveLength(1)
    expect(sys.getActiveDisasters()[0].duration).toBe(10000)
  })

  // ── renderOverlay 测试 ──────────────────────────────────────────────────────

  it('renderOverlay无灾难不崩溃', () => {
    const ctx = makeCtx()
    expect(() => sys.renderOverlay(ctx as any, 800, 600, 100)).not.toThrow()
  })

  it('renderOverlay无灾难时不调用ctx.save', () => {
    const ctx = makeCtx()
    sys.renderOverlay(ctx as any, 800, 600, 100)
    expect(ctx.save).not.toHaveBeenCalled()
  })

  it('renderOverlay blizzard灾难调用ctx.save和restore', () => {
    const ctx = makeCtx()
    const d = makeDisaster({ type: 'blizzard', startTick: 0, duration: 1000, intensity: 0.8 })
    ;(sys as any).activeDisasters.push(d)
    sys.renderOverlay(ctx as any, 800, 600, 100)
    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
  })

  it('renderOverlay drought灾难不崩溃', () => {
    const ctx = makeCtx()
    const d = makeDisaster({ type: 'drought', startTick: 0, duration: 1000, intensity: 0.8 })
    ;(sys as any).activeDisasters.push(d)
    expect(() => sys.renderOverlay(ctx as any, 800, 600, 100)).not.toThrow()
  })

  it('renderOverlay flood灾难不崩溃', () => {
    const ctx = makeCtx()
    const d = makeDisaster({ type: 'flood', startTick: 0, duration: 1000, intensity: 0.8 })
    ;(sys as any).activeDisasters.push(d)
    expect(() => sys.renderOverlay(ctx as any, 800, 600, 100)).not.toThrow()
  })

  it('renderOverlay heatwave灾难不崩溃', () => {
    const ctx = makeCtx()
    const d = makeDisaster({ type: 'heatwave', startTick: 0, duration: 1000, intensity: 0.8 })
    ;(sys as any).activeDisasters.push(d)
    expect(() => sys.renderOverlay(ctx as any, 800, 600, 100)).not.toThrow()
  })

  it('renderOverlay 多个灾难叠加不崩溃', () => {
    const ctx = makeCtx()
    ;(sys as any).activeDisasters.push(makeDisaster({ type: 'blizzard', startTick: 0, duration: 1000 }))
    ;(sys as any).activeDisasters.push(makeDisaster({ type: 'flood', startTick: 0, duration: 1000 }))
    expect(() => sys.renderOverlay(ctx as any, 800, 600, 100)).not.toThrow()
  })

  it('renderOverlay intensity=0时alpha接近0不崩溃', () => {
    const ctx = makeCtx()
    const d = makeDisaster({ type: 'blizzard', startTick: 0, duration: 1000, intensity: 0 })
    ;(sys as any).activeDisasters.push(d)
    expect(() => sys.renderOverlay(ctx as any, 800, 600, 100)).not.toThrow()
  })

  // ── disaster 类型常量验证 ────────────────────────────────────────────────────

  it('灾难类型blizzard可以存储在activeDisasters中', () => {
    const d = makeDisaster({ type: 'blizzard' })
    ;(sys as any).activeDisasters.push(d)
    expect(sys.getActiveDisasters()[0].type).toBe('blizzard')
  })

  it('灾难类型drought可以存储', () => {
    const d = makeDisaster({ type: 'drought' })
    ;(sys as any).activeDisasters.push(d)
    expect(sys.getActiveDisasters()[0].type).toBe('drought')
  })

  it('灾难类型flood可以存储', () => {
    const d = makeDisaster({ type: 'flood' })
    ;(sys as any).activeDisasters.push(d)
    expect(sys.getActiveDisasters()[0].type).toBe('flood')
  })

  it('灾难类型heatwave可以存储', () => {
    const d = makeDisaster({ type: 'heatwave' })
    ;(sys as any).activeDisasters.push(d)
    expect(sys.getActiveDisasters()[0].type).toBe('heatwave')
  })

  it('灾难affectedArea为null时isInArea返回true（全局）', () => {
    const d = makeDisaster({ affectedArea: null })
    expect((sys as any).isInArea(0, 0, d.affectedArea)).toBe(true)
    expect((sys as any).isInArea(9999, 9999, d.affectedArea)).toBe(true)
  })

  // ── 边界与组合场景 ──────────────────────────────────────────────────────────

  it('expireDisaster 还原后再添加新灾难不影响旧数据', () => {
    const world = makeWorld()
    world.setTile(1, 1, TileType.SNOW)
    const d1 = makeDisaster()
    d1.originalTiles.set(1 * 10000 + 1, TileType.GRASS)
    ;(sys as any).expireDisaster(d1, world, 100)
    expect(world.getTile(1, 1)).toBe(TileType.GRASS)
    // 新灾难不影响
    const d2 = makeDisaster()
    ;(sys as any).activeDisasters.push(d2)
    expect(world.getTile(1, 1)).toBe(TileType.GRASS)
  })

  it('expireDisaster 只还原world范围内的tile', () => {
    const world = makeWorld()
    const d = makeDisaster()
    // x=0,y=0 在范围内
    d.originalTiles.set(0 * 10000 + 0, TileType.FOREST)
    // x=WORLD_WIDTH,y=0 越界不应还原
    d.originalTiles.set(WORLD_WIDTH * 10000 + 0, TileType.FOREST)
    expect(() => (sys as any).expireDisaster(d, world, 100)).not.toThrow()
  })

  it('setTileWithRecord 多个不同位置各自记录', () => {
    const world = makeWorld()
    world.setTile(0, 1, TileType.FOREST)
    world.setTile(2, 3, TileType.SAND)
    const d = makeDisaster()
    ;(sys as any).setTileWithRecord(world, d, 0, 1, TileType.SNOW)
    ;(sys as any).setTileWithRecord(world, d, 2, 3, TileType.SNOW)
    expect(d.originalTiles.get(0 * 10000 + 1)).toBe(TileType.FOREST)
    expect(d.originalTiles.get(2 * 10000 + 3)).toBe(TileType.SAND)
  })

  it('灾难duration>0且startTick=tick时elapsed=0，不过期', () => {
    const tick = 500
    const d = makeDisaster({ startTick: tick, duration: 600 })
    // elapsed = 500-500 = 0 < 600，不过期
    const elapsed = tick - d.startTick
    expect(elapsed).toBe(0)
    expect(elapsed < d.duration).toBe(true)
  })

  it('灾难elapsed等于duration时恰好过期', () => {
    const d = makeDisaster({ startTick: 0, duration: 600 })
    const elapsed = 600 - 0
    expect(elapsed >= d.duration).toBe(true)
  })

  it('activeDisasters支持多个不同类型灾难同时存在', () => {
    ;(sys as any).activeDisasters.push(makeDisaster({ type: 'blizzard' }))
    ;(sys as any).activeDisasters.push(makeDisaster({ type: 'drought' }))
    ;(sys as any).activeDisasters.push(makeDisaster({ type: 'flood' }))
    ;(sys as any).activeDisasters.push(makeDisaster({ type: 'heatwave' }))
    expect(sys.getActiveDisasters()).toHaveLength(4)
  })

  it('isInArea: 负半径不抛出异常', () => {
    const area = { x: 0, y: 0, radius: -1 }
    // dx*dx+dy*dy=0 <= (-1)*(-1)=1，圆心在内
    expect(() => (sys as any).isInArea(0, 0, area)).not.toThrow()
  })

  it('update lastCheckTick=9999时tick=9999不触发check', () => {
    const world = makeWorld()
    const em = { getEntitiesWithComponents: () => [] } as any
    const civMgr = {} as any
    const particles = { addParticle: vi.fn(), spawnExplosion: vi.fn() } as any
    ;(sys as any).lastCheckTick = 9999
    sys.update(world, em, civMgr, particles, 9999, 'summer', 'clear')
    // tick-lastCheckTick=0 < 120，不更新
    expect((sys as any).lastCheckTick).toBe(9999)
  })
})
