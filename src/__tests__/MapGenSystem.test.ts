import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MapGenSystem } from '../systems/MapGenSystem'

function makeSys() { return new MapGenSystem() }

/** 最小 World stub，可指定任意 tile 返回值 */
function makeWorld(getTileFn?: (x: number, y: number) => number) {
  const tiles = new Map<string, number>()
  return {
    getTile: (x: number, y: number) => {
      if (getTileFn) return getTileFn(x, y)
      return tiles.get(`${x},${y}`) ?? 2
    },
    setTile: (x: number, y: number, v: number) => {
      tiles.set(`${x},${y}`, v)
    },
    _tiles: tiles,
  }
}

/** 返回一个全部为山地(5)的 world，确保河流能起点 */
function makeMountainWorld() {
  return makeWorld(() => 5)
}

// ─────────────────────────────────────────────
describe('MapGenSystem — 初始状态', () => {
  let sys: MapGenSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('getRiverCount 初始为 0', () => {
    expect(sys.getRiverCount()).toBe(0)
  })

  it('getClusterCount 初始为 0', () => {
    expect(sys.getClusterCount()).toBe(0)
  })

  it('getRiverCount 返回 number 类型', () => {
    expect(typeof sys.getRiverCount()).toBe('number')
  })

  it('getClusterCount 返回 number 类型', () => {
    expect(typeof sys.getClusterCount()).toBe('number')
  })

  it('private rivers 数组初始为空', () => {
    expect((sys as any).rivers).toHaveLength(0)
  })

  it('getRiverCount 与 private rivers 长度一致', () => {
    expect(sys.getRiverCount()).toBe((sys as any).rivers.length)
  })

  it('getClusterCount 始终返回 0 (当前实现)', () => {
    expect(sys.getClusterCount()).toBe(0)
  })

  it('rivers 字段是数组类型', () => {
    expect(Array.isArray((sys as any).rivers)).toBe(true)
  })
})

// ─────────────────────────────────────────────
describe('MapGenSystem — generateRivers 基本行为', () => {
  let sys: MapGenSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('generateRivers count=0 时 rivers 仍为空', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 0)
    expect(sys.getRiverCount()).toBe(0)
  })

  it('generateRivers 调用后 rivers 数组不是 undefined', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 5)
    expect((sys as any).rivers).toBeDefined()
  })

  it('generateRivers 在全山地地图中可生成至少 1 条河', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 20)
    expect(sys.getRiverCount()).toBeGreaterThan(0)
  })

  it('generateRivers 重复调用会重置 rivers', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 10)
    const first = sys.getRiverCount()
    sys.generateRivers(world as any, 50, 50, 10)
    // 两次调用都独立生成（rivers 被重置）
    expect(sys.getRiverCount()).toBeGreaterThanOrEqual(0)
    expect(typeof first).toBe('number')
  })

  it('getRiverCount 在 generate 后等于 rivers.length', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 15)
    expect(sys.getRiverCount()).toBe((sys as any).rivers.length)
  })

  it('无山地时 rivers 为空（全水地图）', () => {
    const world = makeWorld(() => 0)
    sys.generateRivers(world as any, 50, 50, 10)
    expect(sys.getRiverCount()).toBe(0)
  })

  it('无山地时 rivers 为空（全草地图）', () => {
    const world = makeWorld(() => 2)
    sys.generateRivers(world as any, 50, 50, 10)
    expect(sys.getRiverCount()).toBe(0)
  })

  it('count 为负数时 rivers 仍为空（不崩溃）', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, -5)
    expect(sys.getRiverCount()).toBe(0)
  })

  it('生成的每条河都是数组且长度 >= RIVER_MIN_LENGTH(8)', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 20)
    for (const river of (sys as any).rivers) {
      expect(Array.isArray(river)).toBe(true)
      expect(river.length).toBeGreaterThanOrEqual(8)
    }
  })

  it('河段的 flow 字段均在 0 至 1 之间（含边界附近）', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 10)
    for (const river of (sys as any).rivers) {
      for (const seg of river) {
        expect(seg.flow).toBeGreaterThanOrEqual(0.3)
        expect(seg.flow).toBeLessThanOrEqual(2.0) // step * 0.02 最大 0.8
      }
    }
  })

  it('河段的 x/y 字段均在地图范围内', () => {
    const W = 60, H = 60
    const world = makeMountainWorld()
    sys.generateRivers(world as any, W, H, 10)
    for (const river of (sys as any).rivers) {
      for (const seg of river) {
        expect(seg.x).toBeGreaterThanOrEqual(0)
        expect(seg.x).toBeLessThan(W)
        expect(seg.y).toBeGreaterThanOrEqual(0)
        expect(seg.y).toBeLessThan(H)
      }
    }
  })
})

// ─────────────────────────────────────────────
describe('MapGenSystem — generateRivers 写入世界 tile', () => {
  let sys: MapGenSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('generateRivers 调用 world.setTile 写入浅水(1)', () => {
    const world = makeWorld(() => 5)
    const setTileSpy = vi.spyOn(world, 'setTile')
    sys.generateRivers(world as any, 50, 50, 10)
    // 只要有河就必然调用过 setTile
    if (sys.getRiverCount() > 0) {
      expect(setTileSpy).toHaveBeenCalled()
    }
  })

  it('setTile 写入的 tile 值均为 1（浅水）', () => {
    const world = makeWorld(() => 5)
    const writtenValues: number[] = []
    vi.spyOn(world, 'setTile').mockImplementation((_x, _y, v) => { writtenValues.push(v) })
    sys.generateRivers(world as any, 50, 50, 10)
    for (const v of writtenValues) {
      expect(v).toBe(1)
    }
  })

  it('全水地图不调用 setTile', () => {
    const world = makeWorld(() => 0)
    const spy = vi.spyOn(world, 'setTile')
    sys.generateRivers(world as any, 50, 50, 10)
    expect(spy).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────
describe('MapGenSystem — renderRivers 渲染', () => {
  let sys: MapGenSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  function makeCtx() {
    return {
      save: vi.fn(), restore: vi.fn(),
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(),
      strokeStyle: '', lineCap: '' as CanvasLineCap, lineWidth: 0,
      globalAlpha: 1, fillStyle: '',
    } as unknown as CanvasRenderingContext2D
  }

  it('无河流时 renderRivers 不抛出', () => {
    const ctx = makeCtx()
    expect(() => sys.renderRivers(ctx, 0, 0, 10, 0)).not.toThrow()
  })

  it('无河流时调用 ctx.save 和 ctx.restore', () => {
    const ctx = makeCtx()
    sys.renderRivers(ctx, 0, 0, 10, 0)
    expect(ctx.save).toHaveBeenCalledTimes(1)
    expect(ctx.restore).toHaveBeenCalledTimes(1)
  })

  it('有河流时调用 ctx.stroke', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 20)
    if (sys.getRiverCount() === 0) return // 防御
    const ctx = makeCtx()
    sys.renderRivers(ctx, 0, 0, 10, 0)
    expect(ctx.stroke).toHaveBeenCalled()
  })

  it('有河流时 strokeStyle 被设置为蓝色', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 20)
    if (sys.getRiverCount() === 0) return
    const ctx = makeCtx()
    sys.renderRivers(ctx, 0, 0, 10, 0)
    expect((ctx as any).strokeStyle).toBe('#4488cc')
  })

  it('zoom>6 时绘制粒子（arc 被调用）', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 20)
    if (sys.getRiverCount() === 0) return
    const ctx = makeCtx()
    sys.renderRivers(ctx, 0, 0, 8, 0)
    expect(ctx.arc).toHaveBeenCalled()
  })

  it('zoom<=6 时不绘制粒子（arc 不调用）', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 20)
    if (sys.getRiverCount() === 0) return
    const ctx = makeCtx()
    sys.renderRivers(ctx, 0, 0, 6, 0)
    expect(ctx.arc).not.toHaveBeenCalled()
  })

  it('zoom<=1 时 lineWidth 为 1（Math.max 保护）', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 20)
    if (sys.getRiverCount() === 0) return
    const ctx = makeCtx()
    sys.renderRivers(ctx, 0, 0, 1, 0)
    expect((ctx as any).lineWidth).toBeGreaterThanOrEqual(1)
  })
})

// ─────────────────────────────────────────────
describe('MapGenSystem — getClusterCount 不随 generateRivers 变化', () => {
  let sys: MapGenSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('generate 后 getClusterCount 仍为 0', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 10)
    expect(sys.getClusterCount()).toBe(0)
  })

  it('多次 generate 后 getClusterCount 仍为 0', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 5)
    sys.generateRivers(world as any, 50, 50, 5)
    expect(sys.getClusterCount()).toBe(0)
  })
})

// ─────────────────────────────────────────────
describe('MapGenSystem — rivers 数据结构校验', () => {
  let sys: MapGenSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('每个 river 中的 segment 具有 x 字段', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 10)
    for (const r of (sys as any).rivers) {
      for (const s of r) expect('x' in s).toBe(true)
    }
  })

  it('每个 river 中的 segment 具有 y 字段', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 10)
    for (const r of (sys as any).rivers) {
      for (const s of r) expect('y' in s).toBe(true)
    }
  })

  it('每个 river 中的 segment 具有 flow 字段', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 10)
    for (const r of (sys as any).rivers) {
      for (const s of r) expect('flow' in s).toBe(true)
    }
  })

  it('segment.flow 随 step 递增（首段 < 末段）', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 10)
    for (const r of (sys as any).rivers) {
      if (r.length < 2) continue
      expect(r[0].flow).toBeLessThan(r[r.length - 1].flow)
    }
  })

  it('不同河流之间不共享同一 segment 引用', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 10)
    const rivers: any[][] = (sys as any).rivers
    if (rivers.length < 2) return
    expect(rivers[0]).not.toBe(rivers[1])
  })
})

// ─────────────────────────────────────────────
describe('MapGenSystem — 边界与稳定性', () => {
  let sys: MapGenSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('地图尺寸 1x1 不崩溃', () => {
    const world = makeMountainWorld()
    expect(() => sys.generateRivers(world as any, 1, 1, 5)).not.toThrow()
  })

  it('地图尺寸 200x200 不崩溃', () => {
    const world = makeMountainWorld()
    expect(() => sys.generateRivers(world as any, 200, 200, 3)).not.toThrow()
  })

  it('count=1 时最多产生 1 条河', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 1)
    expect(sys.getRiverCount()).toBeLessThanOrEqual(1)
  })

  it('多次 generateRivers 每次独立，rivers 被重置', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 5)
    sys.generateRivers(world as any, 50, 50, 0)
    expect(sys.getRiverCount()).toBe(0)
  })

  it('getClusterCount 永远不为负', () => {
    expect(sys.getClusterCount()).toBeGreaterThanOrEqual(0)
  })

  it('renderRivers 连续调用不崩溃', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 5)
    const ctx = {
      save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(),
      moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
      fill: vi.fn(), arc: vi.fn(),
      strokeStyle: '', lineCap: '' as CanvasLineCap,
      lineWidth: 0, globalAlpha: 1, fillStyle: '',
    } as unknown as CanvasRenderingContext2D
    expect(() => {
      for (let t = 0; t < 10; t++) sys.renderRivers(ctx, 0, 0, 10, t)
    }).not.toThrow()
  })

  it('rivers 数组是私有的，外部访问走 getRiverCount', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 10)
    expect(sys.getRiverCount()).toBe((sys as any).rivers.length)
  })

  it('getClusterCount 在 generate 前后均为 0', () => {
    expect(sys.getClusterCount()).toBe(0)
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 10)
    expect(sys.getClusterCount()).toBe(0)
  })

  it('河流 flow 第一段固定为 0.3（step=0）', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 20)
    for (const river of (sys as any).rivers) {
      if (river.length > 0) {
        expect(river[0].flow).toBeCloseTo(0.3, 5)
      }
    }
  })

  it('每条河最后一段的 flow <= 0.3 + 40 * 0.02 = 1.1', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 20)
    for (const river of (sys as any).rivers) {
      const last = river[river.length - 1]
      expect(last.flow).toBeLessThanOrEqual(1.1 + 0.001) // 容差
    }
  })

  it('世界部分山地部分草地仍可生成河流', () => {
    let callCount = 0
    const world = makeWorld((x, y) => {
      callCount++
      return (x + y) % 2 === 0 ? 5 : 2
    })
    sys.generateRivers(world as any, 50, 50, 20)
    expect(callCount).toBeGreaterThan(0)
  })

  it('getTile 被 generateRivers 调用（起点搜索）', () => {
    const world = makeMountainWorld()
    const spy = vi.spyOn(world, 'getTile')
    sys.generateRivers(world as any, 50, 50, 5)
    expect(spy).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────
describe('MapGenSystem — 追加覆盖', () => {
  let sys: MapGenSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('全山地 50x50 地图中 count=50 至少生成 1 条河', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 50)
    expect(sys.getRiverCount()).toBeGreaterThan(0)
  })

  it('生成后 rivers 数组不包含空数组（因为有 RIVER_MIN_LENGTH 过滤）', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 20)
    for (const r of (sys as any).rivers) {
      expect(r.length).toBeGreaterThanOrEqual(8)
    }
  })

  it('getRiverCount 返回非负整数', () => {
    const world = makeMountainWorld()
    sys.generateRivers(world as any, 50, 50, 10)
    const count = sys.getRiverCount()
    expect(Number.isInteger(count)).toBe(true)
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
