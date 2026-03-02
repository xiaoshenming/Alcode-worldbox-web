import { describe, it, expect, beforeEach } from 'vitest'
import { WeatherDisasterSystem } from '../systems/WeatherDisasterSystem'
import type { ActiveWeatherDisaster } from '../systems/WeatherDisasterSystem'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'

function makeSys() { return new WeatherDisasterSystem() }

// 构造最小的 ActiveWeatherDisaster
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

// 构造最小 World mock
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

describe('WeatherDisasterSystem', () => {
  let sys: WeatherDisasterSystem

  beforeEach(() => { sys = makeSys() })

  // ── 初始状态 ────────────────────────────────────────────────────────────────

  it('getActiveDisasters初始为空', () => {
    expect(sys.getActiveDisasters()).toHaveLength(0)
  })

  it('getActiveDisasters返回数组', () => {
    expect(Array.isArray(sys.getActiveDisasters())).toBe(true)
  })

  it('lastCheckTick初始为0', () => {
    expect((sys as any).lastCheckTick).toBe(0)
  })

  // ── expireDisaster：tile 恢复逻辑 ───────────────────────────────────────────

  it('expireDisaster 把 originalTiles 还原到世界', () => {
    const world = makeWorld()
    world.setTile(5, 5, TileType.SNOW) // 当前是雪

    const d = makeDisaster()
    // 记录 (5,5) 原来是草地
    d.originalTiles.set(5 * 10000 + 5, TileType.GRASS)

    ;(sys as any).expireDisaster(d, world, 100)

    // 应该被还原为草地
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
    // 越界坐标（x=-1 -> key会是负数）
    d.originalTiles.set(-1 * 10000 + 0, TileType.GRASS)

    expect(() => (sys as any).expireDisaster(d, world, 100)).not.toThrow()
  })

  // ── isInArea 工具函数 ───────────────────────────────────────────────────────

  it('isInArea: 圆心在区域内返回true', () => {
    const area = { x: 10, y: 10, radius: 5 }
    expect((sys as any).isInArea(10, 10, area)).toBe(true)
  })

  it('isInArea: 边界点(radius距离)在区域内', () => {
    const area = { x: 0, y: 0, radius: 5 }
    // 距离=5, 5*5=25 <= 5*5=25
    expect((sys as any).isInArea(5, 0, area)).toBe(true)
  })

  it('isInArea: 边界外的点返回false', () => {
    const area = { x: 0, y: 0, radius: 5 }
    // 距离=6 > 5
    expect((sys as any).isInArea(6, 0, area)).toBe(false)
  })

  it('isInArea: null area始终返回true（全局灾难）', () => {
    expect((sys as any).isInArea(999, 999, null)).toBe(true)
  })

  // ── setTileWithRecord 工具函数 ──────────────────────────────────────────────

  it('setTileWithRecord 首次记录original tile', () => {
    const world = makeWorld()
    world.setTile(3, 3, TileType.FOREST)  // 原来是森林

    const d = makeDisaster()
    ;(sys as any).setTileWithRecord(world, d, 3, 3, TileType.SNOW)

    // 应设置新tile
    expect(world.getTile(3, 3)).toBe(TileType.SNOW)
    // 应记录原始tile
    expect(d.originalTiles.get(3 * 10000 + 3)).toBe(TileType.FOREST)
  })

  it('setTileWithRecord 不覆盖已记录的original（幂等）', () => {
    const world = makeWorld()
    world.setTile(5, 5, TileType.GRASS)

    const d = makeDisaster()
    // 已有记录（原来是森林）
    d.originalTiles.set(5 * 10000 + 5, TileType.FOREST)
    ;(sys as any).setTileWithRecord(world, d, 5, 5, TileType.SNOW)

    // tile被设为SNOW
    expect(world.getTile(5, 5)).toBe(TileType.SNOW)
    // original还是森林（不被覆盖）
    expect(d.originalTiles.get(5 * 10000 + 5)).toBe(TileType.FOREST)
  })

  // ── renderOverlay 空灾难不崩溃 ──────────────────────────────────────────────

  it('renderOverlay无灾难不崩溃', () => {
    const ctx = {
      save: () => {}, restore: () => {}, fillRect: () => {}, beginPath: () => {},
      moveTo: () => {}, lineTo: () => {}, stroke: () => {}, fillStyle: '',
      globalAlpha: 1, strokeStyle: '', lineWidth: 1,
    }
    expect(() => sys.renderOverlay(ctx as any, 800, 600, 100)).not.toThrow()
  })
})
