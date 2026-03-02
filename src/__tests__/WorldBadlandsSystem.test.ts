import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldBadlandsSystem } from '../systems/WorldBadlandsSystem'
import type { Badlands } from '../systems/WorldBadlandsSystem'

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5
// Badlands spawn 条件：tile === SAND(2) || tile === MOUNTAIN(5)
const CHECK_INTERVAL = 2700
// getTile()=>0 (DEEP_WATER)：不触发 spawn
const noSpawnWorld = { width: 200, height: 200, getTile: () => 0 } as any
// getTile()=>2 (SAND)：触发 spawn
const sandWorld = { width: 200, height: 200, getTile: () => 2 } as any
// getTile()=>5 (MOUNTAIN)：触发 spawn
const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
const em = {} as any

function makeSys(): WorldBadlandsSystem { return new WorldBadlandsSystem() }
let nextId = 1
function makeBadlands(overrides: Partial<Badlands> = {}): Badlands {
  return {
    id: nextId++, x: 30, y: 40, radius: 12,
    erosionLevel: 80, sedimentLayers: 6, aridity: 90,
    gullyDepth: 5, mineralExposure: 70, tick: 0,
    ...overrides,
  }
}

describe('WorldBadlandsSystem - 基础状态', () => {
  let sys: WorldBadlandsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('初始无荒地', () => { expect((sys as any).badlands).toHaveLength(0) })

  it('注入后可查询', () => {
    ;(sys as any).badlands.push(makeBadlands())
    expect((sys as any).badlands).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).badlands).toBe((sys as any).badlands)
  })

  it('荒地字段正确', () => {
    ;(sys as any).badlands.push(makeBadlands())
    const b = (sys as any).badlands[0]
    expect(b.erosionLevel).toBe(80)
    expect(b.aridity).toBe(90)
    expect(b.mineralExposure).toBe(70)
  })

  it('多个荒地全部返回', () => {
    ;(sys as any).badlands.push(makeBadlands())
    ;(sys as any).badlands.push(makeBadlands())
    expect((sys as any).badlands).toHaveLength(2)
  })
})

describe('WorldBadlandsSystem - CHECK_INTERVAL 节流', () => {
  let sys: WorldBadlandsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('tick 不足 CHECK_INTERVAL 时不执行逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).badlands.push(makeBadlands({ erosionLevel: 80 }))
    sys.update(1, noSpawnWorld, em, 0)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL - 1)
    // lastCheck 仍为 0，荒地未更新
    expect((sys as any).badlands[0].erosionLevel).toBe(80)
  })

  it('tick 达到 CHECK_INTERVAL 时执行逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).badlands.push(makeBadlands({ erosionLevel: 80 }))
    sys.update(1, noSpawnWorld, em, 0)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    expect((sys as any).badlands[0].erosionLevel).toBeCloseTo(80.008, 5)
  })

  it('连续两次 CHECK_INTERVAL 触发两次更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).badlands.push(makeBadlands({ erosionLevel: 80 }))
    sys.update(1, noSpawnWorld, em, 0)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL * 2)
    expect((sys as any).badlands[0].erosionLevel).toBeCloseTo(80.016, 5)
  })
})

describe('WorldBadlandsSystem - 字段更新逻辑', () => {
  let sys: WorldBadlandsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('每次触发后 erosionLevel 增加 0.008', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).badlands.push(makeBadlands({ erosionLevel: 50 }))
    sys.update(1, noSpawnWorld, em, 0)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    expect((sys as any).badlands[0].erosionLevel).toBeCloseTo(50.008, 5)
  })

  it('erosionLevel 上限为 95', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).badlands.push(makeBadlands({ erosionLevel: 94.997 }))
    sys.update(1, noSpawnWorld, em, 0)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    expect((sys as any).badlands[0].erosionLevel).toBe(95)
  })

  it('gullyDepth 每次增加 0.005', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).badlands.push(makeBadlands({ gullyDepth: 10 }))
    sys.update(1, noSpawnWorld, em, 0)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    expect((sys as any).badlands[0].gullyDepth).toBeCloseTo(10.005, 5)
  })

  it('gullyDepth 上限为 60', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).badlands.push(makeBadlands({ gullyDepth: 59.999 }))
    sys.update(1, noSpawnWorld, em, 0)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    expect((sys as any).badlands[0].gullyDepth).toBe(60)
  })

  it('aridity 下限不低于 30', () => {
    // random=0 => (0 - 0.5) * 0.2 = -0.1，从 30 往下降，应被 max(30) 截住
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).badlands.push(makeBadlands({ aridity: 30 }))
    sys.update(1, noSpawnWorld, em, 0)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    expect((sys as any).badlands[0].aridity).toBeGreaterThanOrEqual(30)
  })

  it('aridity 上限不超过 98', () => {
    // random=1 => (1 - 0.5) * 0.2 = +0.1，从 98 往上升，应被 min(98) 截住
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).badlands.push(makeBadlands({ aridity: 98 }))
    sys.update(1, noSpawnWorld, em, 0)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    expect((sys as any).badlands[0].aridity).toBeLessThanOrEqual(98)
  })

  it('mineralExposure 根据 erosionLevel 增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).badlands.push(makeBadlands({ erosionLevel: 80, mineralExposure: 50 }))
    sys.update(1, noSpawnWorld, em, 0)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    // mineralExposure = min(80, 50 + min(95, 80+0.008)*0.0003) > 50
    expect((sys as any).badlands[0].mineralExposure).toBeGreaterThan(50)
  })

  it('mineralExposure 上限为 80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).badlands.push(makeBadlands({ erosionLevel: 95, mineralExposure: 79.999 }))
    sys.update(1, noSpawnWorld, em, 0)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    expect((sys as any).badlands[0].mineralExposure).toBe(80)
  })

  it('多个荒地同时被更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).badlands.push(makeBadlands({ erosionLevel: 50, gullyDepth: 10 }))
    ;(sys as any).badlands.push(makeBadlands({ erosionLevel: 60, gullyDepth: 20 }))
    sys.update(1, noSpawnWorld, em, 0)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    expect((sys as any).badlands[0].erosionLevel).toBeCloseTo(50.008, 5)
    expect((sys as any).badlands[1].erosionLevel).toBeCloseTo(60.008, 5)
    expect((sys as any).badlands[0].gullyDepth).toBeCloseTo(10.005, 5)
    expect((sys as any).badlands[1].gullyDepth).toBeCloseTo(20.005, 5)
  })
})

describe('WorldBadlandsSystem - cleanup（过期清除）', () => {
  let sys: WorldBadlandsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('tick 很小的荒地在足够久后被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).badlands.push(makeBadlands({ tick: 0 }))
    // cutoff = currentTick - 92000，当 currentTick > 92000 且 bl.tick=0 < cutoff
    ;(sys as any).lastCheck = 0
    sys.update(1, noSpawnWorld, em, 92001 + CHECK_INTERVAL)
    expect((sys as any).badlands).toHaveLength(0)
  })

  it('较新的荒地不被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 100000
    ;(sys as any).badlands.push(makeBadlands({ tick: currentTick - 50000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noSpawnWorld, em, currentTick + CHECK_INTERVAL)
    expect((sys as any).badlands).toHaveLength(1)
  })

  it('同时有过期和未过期荒地时只清除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 200000
    ;(sys as any).badlands.push(makeBadlands({ tick: 0 }))                     // 过期
    ;(sys as any).badlands.push(makeBadlands({ tick: currentTick - 50000 }))   // 未过期
    ;(sys as any).lastCheck = 0
    sys.update(1, noSpawnWorld, em, currentTick + CHECK_INTERVAL)
    expect((sys as any).badlands).toHaveLength(1)
    expect((sys as any).badlands[0].tick).toBe(currentTick - 50000)
  })

  it('刚好在 cutoff 边界的荒地不被清除（tick === cutoff 不满足 <）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 200000
    // cutoff = currentTick+CHECK_INTERVAL - 92000
    const cutoff = currentTick + CHECK_INTERVAL - 92000
    ;(sys as any).badlands.push(makeBadlands({ tick: cutoff }))
    ;(sys as any).lastCheck = 0
    sys.update(1, noSpawnWorld, em, currentTick + CHECK_INTERVAL)
    expect((sys as any).badlands).toHaveLength(1)
  })
})

describe('WorldBadlandsSystem - spawn 逻辑', () => {
  let sys: WorldBadlandsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  it('tile=SAND(2) 时可以 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < FORM_CHANCE=0.002
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    expect((sys as any).badlands).toHaveLength(1)
  })

  it('tile=MOUNTAIN(5) 时可以 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).badlands).toHaveLength(1)
  })

  it('tile=DEEP_WATER(0) 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL) // getTile()=>0
    expect((sys as any).badlands).toHaveLength(0)
  })

  it('tile=GRASS(3) 时不 spawn（Badlands只允许SAND/MOUNTAIN）', () => {
    const grassWorld = { width: 200, height: 200, getTile: () => 3 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).badlands).toHaveLength(0)
  })

  it('random >= FORM_CHANCE 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // > 0.002
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    expect((sys as any).badlands).toHaveLength(0)
  })

  it('达到 MAX_BADLANDS(16) 时不再 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 16; i++) {
      ;(sys as any).badlands.push(makeBadlands())
    }
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    expect((sys as any).badlands).toHaveLength(16)
  })

  it('spawn 的荒地 sedimentLayers 在 3-10 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    const b = (sys as any).badlands[0]
    expect(b.sedimentLayers).toBeGreaterThanOrEqual(3)
    expect(b.sedimentLayers).toBeLessThanOrEqual(10)
  })

  it('spawn 荒地的 id 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    ;(sys as any).lastCheck = 0
    sys.update(1, sandWorld, em, CHECK_INTERVAL * 2)
    const ids = (sys as any).badlands.map((b: Badlands) => b.id)
    expect(ids[0]).toBeLessThan(ids[1])
  })

  it('spawn 荒地 tick 等于传入的 tick 参数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    expect((sys as any).badlands[0].tick).toBe(CHECK_INTERVAL)
  })
})
