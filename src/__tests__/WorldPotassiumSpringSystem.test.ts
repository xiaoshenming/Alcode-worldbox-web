import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldPotassiumSpringSystem } from '../systems/WorldPotassiumSpringSystem'
import type { PotassiumSpringZone } from '../systems/WorldPotassiumSpringSystem'
import { TileType } from '../utils/Constants'

// 与源码一致的常量
const CHECK_INTERVAL = 3225
const FORM_CHANCE = 0.0033
const MAX_ZONES = 35

function makeSys(): WorldPotassiumSpringSystem { return new WorldPotassiumSpringSystem() }
let nextId = 1
function makeZone(overrides: Partial<PotassiumSpringZone> = {}): PotassiumSpringZone {
  return {
    id: nextId++, x: 20, y: 30,
    potassiumContent: 60,
    springFlow: 30,
    geologicalDeposit: 50,
    mineralConcentration: 40,
    tick: 0,
    ...overrides
  }
}

// world 模拟：getTile 总返回 MOUNTAIN(5)，使得 hasAdjacentTile 判断为 nearMountain=true
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
describe('WorldPotassiumSpringSystem 初始状态', () => {
  let sys: WorldPotassiumSpringSystem
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

  it('zone 字段 potassiumContent 读取正确', () => {
    ;(sys as any).zones.push(makeZone({ potassiumContent: 77 }))
    expect((sys as any).zones[0].potassiumContent).toBe(77)
  })

  it('zone 字段 springFlow 读取正确', () => {
    ;(sys as any).zones.push(makeZone({ springFlow: 42 }))
    expect((sys as any).zones[0].springFlow).toBe(42)
  })

  it('zone 字段 geologicalDeposit 读取正确', () => {
    ;(sys as any).zones.push(makeZone({ geologicalDeposit: 88 }))
    expect((sys as any).zones[0].geologicalDeposit).toBe(88)
  })

  it('zone 字段 mineralConcentration 读取正确', () => {
    ;(sys as any).zones.push(makeZone({ mineralConcentration: 55 }))
    expect((sys as any).zones[0].mineralConcentration).toBe(55)
  })
})

// ─────────────────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────────────────────
describe('WorldPotassiumSpringSystem CHECK_INTERVAL节流', () => {
  let sys: WorldPotassiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 小于 CHECK_INTERVAL 时 lastCheck 不更新', () => {
    const world = makeWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 等于 CHECK_INTERVAL 时触发更新，lastCheck 被设置', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick 超过 CHECK_INTERVAL 时触发更新，lastCheck 被设置为当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it('第二次 tick 未超过间隔不再触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    const lastCheck = (sys as any).lastCheck
    sys.update(1, world, mockEm, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(lastCheck)
  })

  it('两次都满足间隔时 lastCheck 都更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    sys.update(1, world, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('tick=0 不触发更新（0 < CHECK_INTERVAL）', () => {
    const world = makeWorld()
    sys.update(1, world, mockEm, 0)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时 zones 可能有变化（但 lastCheck 一定更新）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('lastCheck 初始为 0，首次触发门槛为 CHECK_INTERVAL', () => {
    expect((sys as any).lastCheck).toBe(0)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld()
    sys.update(1, world, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

// ─────────────────────────────────────────────────────────
// 3. spawn 条件
// ─────────────────────────────────────────────────────────
describe('WorldPotassiumSpringSystem spawn条件', () => {
  let sys: WorldPotassiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random=0（<FORM_CHANCE）且近水时会 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.SHALLOW_WATER)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random=0（<FORM_CHANCE）且近山时会 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random=0（<FORM_CHANCE）且近深水时会 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.DEEP_WATER)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random=0.9（>FORM_CHANCE）时不 spawn（即使地形合适）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('地形既不近水也不近山时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.GRASS)
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

  it('每次最多尝试 3 次 spawn（attempt 循环）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })

  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    const spawned = (sys as any).zones.length
    expect((sys as any).nextId).toBe(1 + spawned)
  })

  it('spawn 的 zone 记录了正确的 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const z of (sys as any).zones) {
      expect(z.tick).toBe(CHECK_INTERVAL)
    }
  })

  it('未触发 CHECK_INTERVAL 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────
// 4. spawn 字段范围
// ─────────────────────────────────────────────────────────
describe('WorldPotassiumSpringSystem spawn字段范围', () => {
  let sys: WorldPotassiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnZones() {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    return (sys as any).zones as PotassiumSpringZone[]
  }

  it('potassiumContent 在 [46, 100] 范围内', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(z.potassiumContent).toBeGreaterThanOrEqual(46)
      expect(z.potassiumContent).toBeLessThanOrEqual(100)
    }
  })

  it('springFlow 在 [16, 60] 范围内', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(z.springFlow).toBeGreaterThanOrEqual(16)
      expect(z.springFlow).toBeLessThanOrEqual(60)
    }
  })

  it('geologicalDeposit 在 [26, 100] 范围内', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(z.geologicalDeposit).toBeGreaterThanOrEqual(26)
      expect(z.geologicalDeposit).toBeLessThanOrEqual(100)
    }
  })

  it('mineralConcentration 在 [20, 100] 范围内', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(z.mineralConcentration).toBeGreaterThanOrEqual(20)
      expect(z.mineralConcentration).toBeLessThanOrEqual(100)
    }
  })

  it('random=0 时 potassiumContent 最小值为 46', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(z.potassiumContent).toBeCloseTo(46, 0)
    }
  })

  it('random=0 时 springFlow 最小值为 16', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(z.springFlow).toBeCloseTo(16, 0)
    }
  })

  it('spawn 的 zone 有 x 和 y 坐标', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(typeof z.x).toBe('number')
      expect(typeof z.y).toBe('number')
    }
  })

  it('spawn 的 zone 有正整数 id', () => {
    const zones = spawnZones()
    for (const z of zones) {
      expect(z.id).toBeGreaterThan(0)
    }
  })
})

// ─────────────────────────────────────────────────────────
// 5. update 数值逻辑（此系统仅 spawn + cleanup，无字段更新）
// ─────────────────────────────────────────────────────────
describe('WorldPotassiumSpringSystem update数值逻辑', () => {
  let sys: WorldPotassiumSpringSystem
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

  it('zone 字段在 update 中不被修改（只有 spawn 时赋值）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ potassiumContent: 77, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].potassiumContent).toBe(77)
  })

  it('update 不修改已存在 zone 的 springFlow', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ springFlow: 35, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].springFlow).toBe(35)
  })

  it('update 不修改已存在 zone 的 geologicalDeposit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ geologicalDeposit: 66, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].geologicalDeposit).toBe(66)
  })

  it('update 不修改已存在 zone 的 mineralConcentration', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ mineralConcentration: 44, tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].mineralConcentration).toBe(44)
  })

  it('zones 中年轻 zone 在 update 后依然存在', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('连续多次 update，lastCheck 每次正确推进', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, world, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('世界尺寸影响 spawn 坐标范围（x < world.width）', () => {
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
// ─────────────────────────────────────────────────────────
describe('WorldPotassiumSpringSystem cleanup逻辑', () => {
  let sys: WorldPotassiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  const CUTOFF_AGE = 57000

  it('tick < cutoff 的 zone 被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const oldTick = 0
    ;(sys as any).zones.push(makeZone({ tick: oldTick }))
    const currentTick = CHECK_INTERVAL + CUTOFF_AGE + 1
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick === cutoff 的 zone 不被删除（严格 < 才删）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + CUTOFF_AGE
    const zoneTick = currentTick - CUTOFF_AGE  // = CHECK_INTERVAL，cutoff = currentTick - CUTOFF_AGE
    ;(sys as any).zones.push(makeZone({ tick: zoneTick }))
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, currentTick)
    // zone.tick === cutoff，不满足 < cutoff，不删除
    expect((sys as any).zones).toHaveLength(1)
  })

  it('年轻 zone（tick 大于 cutoff）不被删除', () => {
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
    ;(sys as any).zones.push(makeZone({ tick: 0 }))          // 旧：应删除
    ;(sys as any).zones.push(makeZone({ tick: currentTick - 100 })) // 新：应保留
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(currentTick - 100)
  })

  it('所有 zone 都过期时，zones 变为空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + CUTOFF_AGE + 1
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('cleanup 使用逆序删除，不遗漏任何过期 zone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + CUTOFF_AGE + 1
    for (let i = 0; i < 10; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, currentTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('cleanup 发生在 spawn 之后（同一次 update）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + CUTOFF_AGE + 1
    ;(sys as any).zones.push(makeZone({ tick: 0 }))  // 旧 zone，应被清除
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, currentTick)
    // random=0.9 不会新 spawn，旧的被清除
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
})
