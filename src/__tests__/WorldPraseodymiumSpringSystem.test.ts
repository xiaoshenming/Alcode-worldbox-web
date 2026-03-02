import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldPraseodymiumSpringSystem } from '../systems/WorldPraseodymiumSpringSystem'
import type { PraseodymiumSpringZone } from '../systems/WorldPraseodymiumSpringSystem'
import { TileType } from '../utils/Constants'

// 与源码一致的常量
const CHECK_INTERVAL = 2920
const FORM_CHANCE = 0.003
const MAX_ZONES = 32

function makeSys(): WorldPraseodymiumSpringSystem { return new WorldPraseodymiumSpringSystem() }
let nextId = 1
function makeZone(overrides: Partial<PraseodymiumSpringZone> = {}): PraseodymiumSpringZone {
  return {
    id: nextId++, x: 20, y: 30,
    praseodymiumContent: 60,
    springFlow: 30,
    rareEarthLeaching: 50,
    mineralFluorescence: 40,
    tick: 0,
    ...overrides
  }
}

// world 模拟：getTile 返回 MOUNTAIN，使 hasAdjacentTile 判断 nearMountain=true
function makeWorld(tileValue: number = TileType.MOUNTAIN) {
  return {
    width: 100,
    height: 100,
    getTile: vi.fn().mockReturnValue(tileValue)
  } as any
}

const mockEm = {} as any

// ─────────────────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────────────────
describe('WorldPraseodymiumSpringSystem 初始状态', () => {
  let sys: WorldPraseodymiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始 zones 为空数组', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('zones 是 Array 实例', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })

  it('手动注入一个 zone 后长度为 1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('手动注入多个 zone 后长度正确', () => {
    ;(sys as any).zones.push(makeZone(), makeZone(), makeZone())
    expect((sys as any).zones).toHaveLength(3)
  })

  it('zone 字段 praseodymiumContent 读取正确', () => {
    ;(sys as any).zones.push(makeZone({ praseodymiumContent: 88 }))
    expect((sys as any).zones[0].praseodymiumContent).toBe(88)
  })

  it('zone 字段 springFlow 读取正确', () => {
    ;(sys as any).zones.push(makeZone({ springFlow: 45 }))
    expect((sys as any).zones[0].springFlow).toBe(45)
  })

  it('zone 字段 rareEarthLeaching 读取正确', () => {
    ;(sys as any).zones.push(makeZone({ rareEarthLeaching: 70 }))
    expect((sys as any).zones[0].rareEarthLeaching).toBe(70)
  })

  it('zone 字段 mineralFluorescence 读取正确', () => {
    ;(sys as any).zones.push(makeZone({ mineralFluorescence: 55 }))
    expect((sys as any).zones[0].mineralFluorescence).toBe(55)
  })
})

// ─────────────────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────────────────────
describe('WorldPraseodymiumSpringSystem CHECK_INTERVAL节流', () => {
  let sys: WorldPraseodymiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 小于 CHECK_INTERVAL 时 lastCheck 不更新', () => {
    const world = makeWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 等于 CHECK_INTERVAL 时触发更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick 超过 CHECK_INTERVAL 时 lastCheck 设为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL + 800)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 800)
  })

  it('第二次 tick 未超过间隔不再触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    sys.update(1, world, mockEm, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次都满足间隔时 lastCheck 都更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    sys.update(1, world, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('tick=0 不触发更新', () => {
    const world = makeWorld()
    sys.update(1, world, mockEm, 0)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('lastCheck=0 时首次触发门槛为 CHECK_INTERVAL', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('CHECK_INTERVAL 值为 2920', () => {
    expect(CHECK_INTERVAL).toBe(2920)
  })
})

// ─────────────────────────────────────────────────────────
// 3. spawn 条件
// ─────────────────────────────────────────────────────────
describe('WorldPraseodymiumSpringSystem spawn条件', () => {
  let sys: WorldPraseodymiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random=0 且近浅水时会 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.SHALLOW_WATER)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random=0 且近深水时会 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.DEEP_WATER)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random=0 且近山时会 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random=0.9（>FORM_CHANCE）时不 spawn（即使地形合适）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('地形为草地时（既不近水也不近山）不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.GRASS)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('地形为熔岩时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.LAVA)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zones 已满 MAX_ZONES 时不再 spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('每次最多尝试 3 次 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })

  it('spawn 后 nextId 递增正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    const spawned = (sys as any).zones.length
    expect((sys as any).nextId).toBe(1 + spawned)
  })

  it('spawn 的 zone 记录正确的 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const z of (sys as any).zones) {
      expect(z.tick).toBe(CHECK_INTERVAL)
    }
  })
})

// ─────────────────────────────────────────────────────────
// 4. spawn 字段范围
// ─────────────────────────────────────────────────────────
describe('WorldPraseodymiumSpringSystem spawn字段范围', () => {
  let sys: WorldPraseodymiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnZones() {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    return (sys as any).zones as PraseodymiumSpringZone[]
  }

  it('praseodymiumContent 在 [40, 100] 范围内', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(z.praseodymiumContent).toBeGreaterThanOrEqual(40)
      expect(z.praseodymiumContent).toBeLessThanOrEqual(100)
    }
  })

  it('springFlow 在 [10, 60] 范围内', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(z.springFlow).toBeGreaterThanOrEqual(10)
      expect(z.springFlow).toBeLessThanOrEqual(60)
    }
  })

  it('rareEarthLeaching 在 [20, 100] 范围内', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(z.rareEarthLeaching).toBeGreaterThanOrEqual(20)
      expect(z.rareEarthLeaching).toBeLessThanOrEqual(100)
    }
  })

  it('mineralFluorescence 在 [15, 100] 范围内', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(z.mineralFluorescence).toBeGreaterThanOrEqual(15)
      expect(z.mineralFluorescence).toBeLessThanOrEqual(100)
    }
  })

  it('random=0 时 praseodymiumContent 最小值约为 40', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(z.praseodymiumContent).toBeCloseTo(40, 0)
    }
  })

  it('random=0 时 springFlow 最小值约为 10', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(z.springFlow).toBeCloseTo(10, 0)
    }
  })

  it('spawn 的 zone 有合法 x, y 坐标', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(typeof z.x).toBe('number')
      expect(typeof z.y).toBe('number')
      expect(z.x).toBeGreaterThanOrEqual(0)
      expect(z.y).toBeGreaterThanOrEqual(0)
    }
  })

  it('spawn 的 zone id 为正整数', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(Number.isInteger(z.id)).toBe(true)
      expect(z.id).toBeGreaterThan(0)
    }
  })
})

// ─────────────────────────────────────────────────────────
// 5. update 数值逻辑
// ─────────────────────────────────────────────────────────
describe('WorldPraseodymiumSpringSystem update数值逻辑', () => {
  let sys: WorldPraseodymiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('多次触发 update 后 zones 长度不超过 MAX_ZONES', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    for (let t = 0; t < 20; t++) {
      sys.update(1, world, mockEm, CHECK_INTERVAL * (t + 1))
    }
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  it('update 不修改已存在 zone 的 praseodymiumContent', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ praseodymiumContent: 77, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].praseodymiumContent).toBe(77)
  })

  it('update 不修改已存在 zone 的 springFlow', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ springFlow: 25, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].springFlow).toBe(25)
  })

  it('update 不修改已存在 zone 的 rareEarthLeaching', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ rareEarthLeaching: 60, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].rareEarthLeaching).toBe(60)
  })

  it('update 不修改已存在 zone 的 mineralFluorescence', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ mineralFluorescence: 33, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].mineralFluorescence).toBe(33)
  })

  it('年轻 zone 在 update 后依然存在', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('连续 update 后 lastCheck 每次正确推进', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, world, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('世界尺寸为 50 时 spawn 坐标在范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = { width: 50, height: 50, getTile: vi.fn().mockReturnValue(TileType.MOUNTAIN) } as any
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const z of (sys as any).zones) {
      expect(z.x).toBeGreaterThanOrEqual(0)
      expect(z.x).toBeLessThan(50)
      expect(z.y).toBeGreaterThanOrEqual(0)
      expect(z.y).toBeLessThan(50)
    }
  })
})

// ─────────────────────────────────────────────────────────
// 6. cleanup 逻辑
// ───────────────────────────────────────────────���─────────
describe('WorldPraseodymiumSpringSystem cleanup逻辑', () => {
  let sys: WorldPraseodymiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  const CUTOFF_AGE = 54000

  it('tick < cutoff 的 zone 被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    const currentTick = CHECK_INTERVAL + CUTOFF_AGE + 1
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick === cutoff 的 zone 不被删除（严格 < 才删）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + CUTOFF_AGE
    const zoneTick = currentTick - CUTOFF_AGE  // cutoff = currentTick - CUTOFF_AGE = CHECK_INTERVAL
    ;(sys as any).zones.push(makeZone({ tick: zoneTick }))
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('年轻 zone 不被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL * 2
    ;(sys as any).zones.push(makeZone({ tick: currentTick - 1000 }))
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('混合新旧 zone，只删除旧的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + CUTOFF_AGE + 1
    ;(sys as any).zones.push(makeZone({ tick: 0 }))                    // 旧
    ;(sys as any).zones.push(makeZone({ tick: currentTick - 100 }))    // 新
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(currentTick - 100)
  })

  it('所有 zone 都过期时 zones 变为空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + CUTOFF_AGE + 1
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('10 个过期 zone 全部被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + CUTOFF_AGE + 1
    for (let i = 0; i < 10; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('cutoff 边界：zone.tick = cutoff-1 时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + CUTOFF_AGE + 1
    const cutoff = currentTick - CUTOFF_AGE
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('cleanup 不影响符合条件的 zone 的字段值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL * 2
    ;(sys as any).zones.push(makeZone({ tick: currentTick - 100, praseodymiumContent: 99 }))
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, currentTick)
    expect((sys as any).zones[0].praseodymiumContent).toBe(99)
  })
})
