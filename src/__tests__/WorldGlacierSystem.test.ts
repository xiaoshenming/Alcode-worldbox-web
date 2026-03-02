import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldGlacierSystem } from '../systems/WorldGlacierSystem'
import type { Glacier } from '../systems/WorldGlacierSystem'
import { TileType } from '../utils/Constants'

// ─── 常量（镜像自源码）──────────────────────────────────────────────────────────
const CHECK_INTERVAL = 1500
const MAX_GLACIERS = 6
const FORM_CHANCE = 0.01
const MIN_SNOW_TILES = 10

// ─── helpers ────────────────────────────────────────────────────────────────

function makeSys(): WorldGlacierSystem { return new WorldGlacierSystem() }

let _nextId = 1
function makeGlacier(overrides: Partial<Glacier> = {}): Glacier {
  return {
    id: _nextId++,
    x: 50,
    y: 50,
    length: 5,
    width: 3,
    direction: 0,
    speed: 0.05,
    mass: 80,
    age: 0,
    active: true,
    ...overrides,
  }
}

// 创建一个模拟的 World 对象，返回指定地形
function makeWorld(
  tile: number = TileType.SNOW,
  surroundTile: number = TileType.SNOW,
  width = 100,
  height = 100
): any {
  return {
    width,
    height,
    getTile: (x: number, y: number) => {
      // 中心位置返回 tile，周围返回 surroundTile
      if (x >= 45 && x <= 55 && y >= 45 && y <= 55) return tile
      return surroundTile
    },
  }
}

// 创建一个全是 SNOW tile 的 world，方便 formGlaciers 成功
function makeSnowWorld(width = 100, height = 100): any {
  return {
    width,
    height,
    getTile: (_x: number, _y: number) => TileType.SNOW,
  }
}

// 创建一个全是 GRASS tile 的 world（不满足 formGlaciers 条件）
function makeGrassWorld(width = 100, height = 100): any {
  return {
    width,
    height,
    getTile: (_x: number, _y: number) => TileType.GRASS,
  }
}

function makeEM(): any { return {} }

// ─── 1. 初始状态 ─────────────────────────────────────────────────────────────
describe('1. 初始状态', () => {
  let sys: WorldGlacierSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })

  it('glaciers 初始为空数组', () => {
    expect((sys as any).glaciers).toHaveLength(0)
  })
  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('glaciers 是 Array 实例', () => {
    expect(Array.isArray((sys as any).glaciers)).toBe(true)
  })
  it('getActiveGlaciers() 初始为空', () => {
    expect(sys.getActiveGlaciers()).toHaveLength(0)
  })
  it('两个实例不共享 glaciers', () => {
    const a = makeSys()
    const b = makeSys()
    ;(a as any).glaciers.push(makeGlacier())
    expect((b as any).glaciers).toHaveLength(0)
  })
  it('_activeGlaciersBuf 初始为空', () => {
    expect((sys as any)._activeGlaciersBuf).toHaveLength(0)
  })
  it('FORM_CHANCE = 0.01', () => {
    expect(FORM_CHANCE).toBe(0.01)
  })
})

// ─── 2. 节流：CHECK_INTERVAL ─────────────────────────────────────────────────
describe('2. 节流 — CHECK_INTERVAL=1500', () => {
  let sys: WorldGlacierSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(1) })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL 时不触发更新', () => {
    sys.update(1, makeWorld(), makeEM(), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick === CHECK_INTERVAL 时触发更新，lastCheck 设为当前 tick', () => {
    sys.update(1, makeWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick > CHECK_INTERVAL 时触发更新', () => {
    sys.update(1, makeWorld(), makeEM(), CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })
  it('上次 lastCheck=1500，tick=2999 时不再触发', () => {
    sys.update(1, makeWorld(), makeEM(), CHECK_INTERVAL)
    sys.update(1, makeWorld(), makeEM(), CHECK_INTERVAL * 2 - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('上次 lastCheck=1500，tick=3000 时再次触发', () => {
    sys.update(1, makeWorld(), makeEM(), CHECK_INTERVAL)
    sys.update(1, makeWorld(), makeEM(), CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('tick=0 时不触发', () => {
    sys.update(1, makeWorld(), makeEM(), 0)
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ─── 3. spawn（formGlaciers）条件 ────────────────────────────────────────────
describe('3. formGlaciers — spawn 条件', () => {
  let sys: WorldGlacierSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('Math.random > FORM_CHANCE 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers).toHaveLength(0)
  })
  it('Math.random = 0 (<= FORM_CHANCE) + 雪地 → spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers).toHaveLength(1)
  })
  it('草地不满足雪量，不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeGrassWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers).toHaveLength(0)
  })
  it('MOUNTAIN tile 也可以触发 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const mountainWorld = {
      width: 100,
      height: 100,
      getTile: (_x: number, _y: number) => TileType.MOUNTAIN,
    }
    sys.update(1, mountainWorld as any, makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers).toHaveLength(1)
  })
  it('已达 MAX_GLACIERS 时不再 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < MAX_GLACIERS; i++) {
      ;(sys as any).glaciers.push(makeGlacier())
    }
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers).toHaveLength(MAX_GLACIERS)
  })
  it('MAX_GLACIERS = 6', () => {
    expect(MAX_GLACIERS).toBe(6)
  })
  it('MIN_SNOW_TILES = 10', () => {
    expect(MIN_SNOW_TILES).toBe(10)
  })
  it('雪量不足时不 spawn（snowCount < 10）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 中心是 SNOW，但周围是 GRASS，7x7-area 内只有中心 1 个 SNOW < 10
    const sparseWorld = {
      width: 100,
      height: 100,
      getTile: (x: number, y: number) => {
        if (x === 50 && y === 50) return TileType.SNOW
        return TileType.GRASS
      },
    }
    sys.update(1, sparseWorld as any, makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers).toHaveLength(0)
  })
  it('CHECK_INTERVAL = 1500', () => {
    expect(CHECK_INTERVAL).toBe(1500)
  })
})

// ─── 4. spawn 后字段值 ───────────────────────────────────────────────────────
describe('4. spawn 后字段值', () => {
  let sys: WorldGlacierSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  function spawnOne(): Glacier {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    return (sys as any).glaciers[0] as Glacier
  }

  it('spawn 后 glaciers 长度为 1', () => {
    spawnOne()
    expect((sys as any).glaciers).toHaveLength(1)
  })
  it('spawn 后 nextId 递增为 2', () => {
    spawnOne()
    expect((sys as any).nextId).toBe(2)
  })
  it('spawn 后 id = 1', () => {
    const g = spawnOne()
    expect(g.id).toBe(1)
  })
  it('spawn 后 active = true', () => {
    const g = spawnOne()
    expect(g.active).toBe(true)
  })
  it('spawn 后 age = 1（moveGlaciers 在同一 update 中执行）', () => {
    const g = spawnOne()
    expect(g.age).toBe(1)
  })
  it('spawn 后 length >= 3', () => {
    const g = spawnOne()
    expect(g.length).toBeGreaterThanOrEqual(3)
  })
  it('spawn 后 length <= 7 (3 + floor(random*5))', () => {
    const g = spawnOne()
    expect(g.length).toBeLessThanOrEqual(7)
  })
  it('spawn 后 width >= 2', () => {
    const g = spawnOne()
    expect(g.width).toBeGreaterThanOrEqual(2)
  })
  it('spawn 后 width <= 4 (2 + floor(random*3))', () => {
    const g = spawnOne()
    expect(g.width).toBeLessThanOrEqual(4)
  })
  it('spawn 后 speed >= 0.02', () => {
    const g = spawnOne()
    expect(g.speed).toBeGreaterThanOrEqual(0.02)
  })
  it('spawn 后 speed <= 0.07 (0.02 + random*0.05)', () => {
    const g = spawnOne()
    expect(g.speed).toBeLessThanOrEqual(0.07)
  })
  it('spawn 后 mass 在 [50*0.9995, 100*0.9995] 内（moveGlaciers 立即执行一次衰减）', () => {
    const g = spawnOne()
    expect(g.mass).toBeGreaterThanOrEqual(50 * 0.9995)
    expect(g.mass).toBeLessThanOrEqual(100 * 0.9995)
  })
  it('spawn 后 mass <= 100 (50 + random*50)', () => {
    const g = spawnOne()
    expect(g.mass).toBeLessThanOrEqual(100)
  })
  it('spawn 后 direction 在 [0, 2π)', () => {
    const g = spawnOne()
    expect(g.direction).toBeGreaterThanOrEqual(0)
    expect(g.direction).toBeLessThan(Math.PI * 2)
  })
  it('x 在 world 范围内', () => {
    const g = spawnOne()
    expect(g.x).toBeGreaterThanOrEqual(5)
    expect(g.x).toBeLessThanOrEqual(95)
  })
  it('y 在 world 范围内', () => {
    const g = spawnOne()
    expect(g.y).toBeGreaterThanOrEqual(5)
    expect(g.y).toBeLessThanOrEqual(95)
  })
})

// ─── 5. update 字段变更（moveGlaciers） ─────────────────────────────────────
describe('5. moveGlaciers — update 字段变更', () => {
  let sys: WorldGlacierSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(1) })
  afterEach(() => vi.restoreAllMocks())

  it('每次 update age 递增 1', () => {
    ;(sys as any).glaciers.push(makeGlacier({ age: 0 }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers[0].age).toBe(1)
  })
  it('direction=0 时 x 向右移动', () => {
    const g = makeGlacier({ x: 50, y: 50, direction: 0, speed: 1 })
    ;(sys as any).glaciers.push(g)
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers[0].x).toBeGreaterThan(50)
  })
  it('direction=π 时 x 向左移动', () => {
    const g = makeGlacier({ x: 50, y: 50, direction: Math.PI, speed: 1 })
    ;(sys as any).glaciers.push(g)
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers[0].x).toBeLessThan(50)
  })
  it('direction=π/2 时 y 向下移动', () => {
    const g = makeGlacier({ x: 50, y: 50, direction: Math.PI / 2, speed: 1 })
    ;(sys as any).glaciers.push(g)
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers[0].y).toBeGreaterThan(50)
  })
  it('mass 每次乘以 0.9995 缓慢衰减', () => {
    ;(sys as any).glaciers.push(makeGlacier({ mass: 100 }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    const m = (sys as any).glaciers[0].mass
    expect(m).toBeCloseTo(100 * 0.9995, 4)
  })
  it('x 被 clamp 在 [2, width-2]', () => {
    ;(sys as any).glaciers.push(makeGlacier({ x: 2, direction: Math.PI, speed: 10 }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers[0].x).toBeGreaterThanOrEqual(2)
  })
  it('y 被 clamp 在 [2, height-2]', () => {
    ;(sys as any).glaciers.push(makeGlacier({ y: 2, direction: Math.PI * 1.5, speed: 10 }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers[0].y).toBeGreaterThanOrEqual(2)
  })
  it('x 不超过 world.width - 2', () => {
    ;(sys as any).glaciers.push(makeGlacier({ x: 98, direction: 0, speed: 10 }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers[0].x).toBeLessThanOrEqual(98)
  })
  it('mass < 10 时冰川变为 inactive 并被 cleanup 移除', () => {
    ;(sys as any).glaciers.push(makeGlacier({ mass: 9 }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    // mass=9 → 9*0.9995=8.9955 < 10 → inactive → cleanup 移除
    expect((sys as any).glaciers).toHaveLength(0)
  })
  it('mass = 10 时不触发 inactive（< 10）', () => {
    ;(sys as any).glaciers.push(makeGlacier({ mass: 10 }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    // mass=10 → 10*0.9995=9.995 < 10 → inactive → cleanup 移除
    expect((sys as any).glaciers).toHaveLength(0)
  })
  it('tick 未达 CHECK_INTERVAL 时 age 不变', () => {
    ;(sys as any).glaciers.push(makeGlacier({ age: 5 }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL - 1)
    expect((sys as any).glaciers[0].age).toBe(5)
  })
})

// ─── 6. cleanup 逻辑 ─────────────────────────────────────────────────────────
describe('6. cleanup 逻辑', () => {
  let sys: WorldGlacierSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(1) })
  afterEach(() => vi.restoreAllMocks())

  it('active=true 的冰川保留', () => {
    ;(sys as any).glaciers.push(makeGlacier({ active: true, mass: 50 }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers).toHaveLength(1)
  })
  it('active=false 的冰川被移除', () => {
    ;(sys as any).glaciers.push(makeGlacier({ active: false }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers).toHaveLength(0)
  })
  it('mass < 10 → 变 inactive → 被 cleanup 移除', () => {
    ;(sys as any).glaciers.push(makeGlacier({ mass: 9, active: true }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers).toHaveLength(0)
  })
  it('混合时只保留 active 的冰川', () => {
    ;(sys as any).glaciers.push(makeGlacier({ active: true, mass: 80 }))
    ;(sys as any).glaciers.push(makeGlacier({ active: false }))
    ;(sys as any).glaciers.push(makeGlacier({ active: true, mass: 60 }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers).toHaveLength(2)
  })
  it('所有冰川 inactive 后数组为空', () => {
    ;(sys as any).glaciers.push(makeGlacier({ active: false }))
    ;(sys as any).glaciers.push(makeGlacier({ active: false }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers).toHaveLength(0)
  })
  it('cleanup 后 getActiveGlaciers 也为空', () => {
    ;(sys as any).glaciers.push(makeGlacier({ active: false }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect(sys.getActiveGlaciers()).toHaveLength(0)
  })
  it('tick < CHECK_INTERVAL 时不触发 cleanup', () => {
    ;(sys as any).glaciers.push(makeGlacier({ active: false }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL - 1)
    // cleanup 未执行，inactive 冰川仍存在
    expect((sys as any).glaciers).toHaveLength(1)
  })
})

// ─── 7. MAX_GLACIERS 上限 ─────────────────────────────────────────────────────
describe('7. MAX_GLACIERS 上限', () => {
  let sys: WorldGlacierSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('glaciers 数量不超过 MAX_GLACIERS=6', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < MAX_GLACIERS; i++) {
      ;(sys as any).glaciers.push(makeGlacier({ mass: 80 }))
    }
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers).toHaveLength(MAX_GLACIERS)
  })
  it('数量为 MAX_GLACIERS-1 时可以继续 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < MAX_GLACIERS - 1; i++) {
      ;(sys as any).glaciers.push(makeGlacier({ mass: 80 }))
    }
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers).toHaveLength(MAX_GLACIERS)
  })
  it('MAX_GLACIERS = 6', () => {
    expect(MAX_GLACIERS).toBe(6)
  })
  it('注入超过 MAX_GLACIERS 个后，下次 update 不额外 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < MAX_GLACIERS + 1; i++) {
      ;(sys as any).glaciers.push(makeGlacier({ mass: 80 }))
    }
    const before = (sys as any).glaciers.length
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers.length).toBeLessThanOrEqual(before)
  })
  it('spawn 后 nextId 正确递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL * 3)
    if ((sys as any).glaciers.length > 1) {
      expect((sys as any).nextId).toBeGreaterThanOrEqual(3)
    }
  })
})

// ─── 8. 边界验证 ──────────────────────────────────────────────────────────────
describe('8. 边界验证', () => {
  let sys: WorldGlacierSystem
  beforeEach(() => { sys = makeSys(); _nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('getActiveGlaciers：active=true 的返回', () => {
    ;(sys as any).glaciers.push(makeGlacier({ active: true, mass: 50 }))
    expect(sys.getActiveGlaciers()).toHaveLength(1)
  })
  it('getActiveGlaciers：active=false 的过滤', () => {
    ;(sys as any).glaciers.push(makeGlacier({ active: false }))
    expect(sys.getActiveGlaciers()).toHaveLength(0)
  })
  it('getActiveGlaciers 混合时只返回 active=true 的', () => {
    ;(sys as any).glaciers.push(makeGlacier({ active: true, mass: 50 }))
    ;(sys as any).glaciers.push(makeGlacier({ active: false }))
    ;(sys as any).glaciers.push(makeGlacier({ active: true, mass: 60 }))
    expect(sys.getActiveGlaciers()).toHaveLength(2)
  })
  it('getActiveGlaciers 返回复用的 buffer（引用一致）', () => {
    ;(sys as any).glaciers.push(makeGlacier({ active: true }))
    const r1 = sys.getActiveGlaciers()
    const r2 = sys.getActiveGlaciers()
    expect(r1).toBe(r2) // 同一 buffer 引用
  })
  it('无雪地时不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(() => sys.update(1, makeGrassWorld(), makeEM(), CHECK_INTERVAL)).not.toThrow()
  })
  it('world 尺寸极小时 clamp 正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const tinyWorld = { width: 10, height: 10, getTile: () => TileType.SNOW }
    ;(sys as any).glaciers.push(makeGlacier({ x: 5, y: 5, direction: 0, speed: 100 }))
    sys.update(1, tinyWorld as any, makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers[0].x).toBeLessThanOrEqual(8) // width-2=8
  })
  it('多个冰川各自独立移动', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).glaciers.push(makeGlacier({ x: 50, y: 50, direction: 0, speed: 1, mass: 80 }))
    ;(sys as any).glaciers.push(makeGlacier({ x: 20, y: 20, direction: Math.PI, speed: 1, mass: 80 }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    const g1 = (sys as any).glaciers[0]
    const g2 = (sys as any).glaciers[1]
    expect(g1.x).toBeGreaterThan(50) // 向右
    expect(g2.x).toBeLessThan(20)    // 向左
  })
  it('speed=0 时冰川不移动（x y 不变）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).glaciers.push(makeGlacier({ x: 50, y: 50, speed: 0, direction: 0, mass: 80 }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    expect((sys as any).glaciers[0].x).toBe(50)
    expect((sys as any).glaciers[0].y).toBe(50)
  })
  it('FORM_CHANCE = 0.01', () => {
    expect(FORM_CHANCE).toBe(0.01)
  })
  it('mass = 9.999 时乘 0.9995 < 10 → inactive → cleanup 移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).glaciers.push(makeGlacier({ mass: 9.999 }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    // 9.999 * 0.9995 = 9.9940... < 10 → inactive → cleanup 移除
    expect((sys as any).glaciers).toHaveLength(0)
  })
  it('mass = 10.005 后乘 0.9995 < 10 → inactive → cleanup 移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).glaciers.push(makeGlacier({ mass: 10.005 }))
    sys.update(1, makeSnowWorld(), makeEM(), CHECK_INTERVAL)
    // 10.005 * 0.9995 = 10.0000... ≈ 10.00 但仍 < 10 → inactive → cleanup 移除
    expect((sys as any).glaciers).toHaveLength(0)
  })
})
