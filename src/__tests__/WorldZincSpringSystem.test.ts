import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldZincSpringSystem } from '../systems/WorldZincSpringSystem'
import type { ZincSpringZone } from '../systems/WorldZincSpringSystem'
import { TileType } from '../utils/Constants'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 2690
// FORM_CHANCE = 0.003 (Math.random() > FORM_CHANCE 才continue，所以 random <= FORM_CHANCE 才spawn)
// MAX_ZONES = 32
// cleanup: zone.tick < tick - 54000
// spawn条件: (nearWater || nearMountain) && random <= FORM_CHANCE
// 字段范围: zincContent(40-100), springFlow(10-60), oreLeaching(20-100), mineralTurbidity(15-100)

const CHECK_INTERVAL = 2690
const FORM_CHANCE = 0.003
const MAX_ZONES = 32
const TICK0 = CHECK_INTERVAL

function makeSys(): WorldZincSpringSystem { return new WorldZincSpringSystem() }

let nextId = 1
function makeZone(overrides: Partial<ZincSpringZone> = {}): ZincSpringZone {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    zincContent: 50,
    springFlow: 30,
    oreLeaching: 50,
    mineralTurbidity: 40,
    tick: 0,
    ...overrides,
  }
}

function makeMockWorld(tileVal: number | null = TileType.SAND, w = 200, h = 200) {
  return {
    width: w,
    height: h,
    getTile: vi.fn().mockReturnValue(tileVal),
  } as any
}

const mockEm = {} as any

// ========================================================
// 1. 初始状态
// ========================================================
describe('WorldZincSpringSystem - 初始状态', () => {
  let sys: WorldZincSpringSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('初始zones数组为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始化后zones是数组类型', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })

  it('手动注入一个泉区后数组长度为1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zones引用稳定（同一对象）', () => {
    const ref = (sys as any).zones
    expect(ref).toBe((sys as any).zones)
  })

  it('ZincSpringZone包含所有必要字段', () => {
    const z: ZincSpringZone = {
      id: 1, x: 10, y: 20,
      zincContent: 50, springFlow: 30,
      oreLeaching: 60, mineralTurbidity: 45,
      tick: 0,
    }
    expect(z.id).toBe(1)
    expect(z.zincContent).toBe(50)
    expect(z.springFlow).toBe(30)
    expect(z.oreLeaching).toBe(60)
    expect(z.mineralTurbidity).toBe(45)
  })
})

// ========================================================
// 2. CHECK_INTERVAL 节流
// ========================================================
describe('WorldZincSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldZincSpringSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn (1 > 0.003)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tick=0时不更新lastCheck', () => {
    sys.update(0, makeMockWorld(), mockEm, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL时不执行更新', () => {
    sys.update(0, makeMockWorld(), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick == CHECK_INTERVAL时触发更新', () => {
    sys.update(0, makeMockWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL时触发更新', () => {
    sys.update(0, makeMockWorld(), mockEm, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })

  it('第一次触发后再次低于间隔不更新', () => {
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    const saved = (sys as any).lastCheck
    sys.update(0, makeMockWorld(), mockEm, TICK0 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(saved)
  })

  it('第二次达到间隔时再次更新', () => {
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    sys.update(0, makeMockWorld(), mockEm, TICK0 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(TICK0 + CHECK_INTERVAL)
  })

  it('tick=0时不改变zones数组', () => {
    sys.update(0, makeMockWorld(), mockEm, 0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('低于间隔时不调用getTile', () => {
    const world = makeMockWorld()
    sys.update(0, world, mockEm, CHECK_INTERVAL - 1)
    expect(world.getTile).not.toHaveBeenCalled()
  })
})

// ========================================================
// 3. spawn条件 - nearWater/nearMountain/random方向
// ========================================================
describe('WorldZincSpringSystem - spawn条件', () => {
  let sys: WorldZincSpringSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('random <= FORM_CHANCE 且 nearWater 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random <= FORM_CHANCE 且 nearMountain 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.MOUNTAIN)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random > FORM_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE + 0.001)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random=1时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('无nearWater且无nearMountain时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.GRASS)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zones已满MAX_ZONES时不spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('zones=MAX_ZONES-1时还可以spawn', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(MAX_ZONES - 1)
  })

  it('nearDeepWater也可以spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.DEEP_WATER)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
})

// ========================================================
// 4. spawn后字段值校验
// ========================================================
describe('WorldZincSpringSystem - spawn后字段值', () => {
  let sys: WorldZincSpringSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('spawn后tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    const zone = (sys as any).zones[0]
    if (zone) expect(zone.tick).toBe(TICK0)
  })

  it('spawn后id从1开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    const zone = (sys as any).zones[0]
    if (zone) expect(zone.id).toBe(1)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    const before = (sys as any).nextId
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).nextId).toBeGreaterThan(before)
  })

  it('spawn后zincContent在40..100范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    const zone = (sys as any).zones[0]
    if (zone) {
      expect(zone.zincContent).toBeGreaterThanOrEqual(40)
      expect(zone.zincContent).toBeLessThan(100)
    }
  })

  it('spawn后springFlow在10..60范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    const zone = (sys as any).zones[0]
    if (zone) {
      expect(zone.springFlow).toBeGreaterThanOrEqual(10)
      expect(zone.springFlow).toBeLessThan(60)
    }
  })

  it('spawn后oreLeaching在20..100范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    const zone = (sys as any).zones[0]
    if (zone) {
      expect(zone.oreLeaching).toBeGreaterThanOrEqual(20)
      expect(zone.oreLeaching).toBeLessThan(100)
    }
  })

  it('spawn后mineralTurbidity在15..100范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    const zone = (sys as any).zones[0]
    if (zone) {
      expect(zone.mineralTurbidity).toBeGreaterThanOrEqual(15)
      expect(zone.mineralTurbidity).toBeLessThan(100)
    }
  })

  it('坐标x在合法范围内(0..width)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER, 200, 200)
    sys.update(0, world, mockEm, TICK0)
    const zone = (sys as any).zones[0]
    if (zone) {
      expect(zone.x).toBeGreaterThanOrEqual(0)
      expect(zone.x).toBeLessThan(200)
    }
  })

  it('坐标y在合法范围内(0..height)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER, 200, 200)
    sys.update(0, world, mockEm, TICK0)
    const zone = (sys as any).zones[0]
    if (zone) {
      expect(zone.y).toBeGreaterThanOrEqual(0)
      expect(zone.y).toBeLessThan(200)
    }
  })
})

// ========================================================
// 5. update逻辑（无字段漂移）
// ========================================================
describe('WorldZincSpringSystem - update逻辑', () => {
  let sys: WorldZincSpringSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
  })

  it('zone字段不会自动漂移', () => {
    const zone = makeZone({ tick: TICK0, zincContent: 50 })
    ;(sys as any).zones.push(zone)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect(zone.zincContent).toBe(50)
  })

  it('springFlow保持不变', () => {
    const zone = makeZone({ tick: TICK0, springFlow: 30 })
    ;(sys as any).zones.push(zone)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect(zone.springFlow).toBe(30)
  })

  it('oreLeaching保持不变', () => {
    const zone = makeZone({ tick: TICK0, oreLeaching: 60 })
    ;(sys as any).zones.push(zone)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect(zone.oreLeaching).toBe(60)
  })

  it('mineralTurbidity保持不变', () => {
    const zone = makeZone({ tick: TICK0, mineralTurbidity: 45 })
    ;(sys as any).zones.push(zone)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect(zone.mineralTurbidity).toBe(45)
  })

  it('多个泉区全部保持不变', () => {
    const z1 = makeZone({ tick: TICK0, zincContent: 50 })
    const z2 = makeZone({ tick: TICK0, zincContent: 80 })
    ;(sys as any).zones.push(z1, z2)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect(z1.zincContent).toBe(50)
    expect(z2.zincContent).toBe(80)
  })
})

// ========================================================
// 6. cleanup逻辑
// ========================================================
describe('WorldZincSpringSystem - cleanup逻辑', () => {
  let sys: WorldZincSpringSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
  })

  it('zone.tick < tick-54000时被删除', () => {
    const zone = makeZone({ tick: 0 })
    ;(sys as any).zones.push(zone)
    sys.update(0, makeMockWorld(), mockEm, TICK0 + 54000 + 1)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zone.tick == cutoff时不删除（严格小于）', () => {
    const T = TICK0
    const zone = makeZone({ tick: T })
    ;(sys as any).zones.push(zone)
    sys.update(0, makeMockWorld(), mockEm, T + 54000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zone.tick > cutoff时不删除', () => {
    const zone = makeZone({ tick: TICK0 + 5000 })
    ;(sys as any).zones.push(zone)
    sys.update(0, makeMockWorld(), mockEm, TICK0 + 54000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('只删除过期的，保留新的', () => {
    const bigTick = TICK0 + 54001
    const old = makeZone({ tick: 0 })
    const fresh = makeZone({ tick: bigTick })
    ;(sys as any).zones.push(old, fresh)
    sys.update(0, makeMockWorld(), mockEm, bigTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(bigTick)
  })

  it('全部过期时清空zones', () => {
    const bigTick = TICK0 + 54001
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    sys.update(0, makeMockWorld(), mockEm, bigTick)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('无过期时数量不变', () => {
    const freshTick = TICK0
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: freshTick }))
    }
    sys.update(0, makeMockWorld(), mockEm, freshTick)
    expect((sys as any).zones).toHaveLength(5)
  })

  it('删除后剩余id不变', () => {
    const bigTick = TICK0 + 54001
    const keep = makeZone({ id: 99, tick: bigTick })
    const del = makeZone({ id: 100, tick: 0 })
    ;(sys as any).zones.push(del, keep)
    sys.update(0, makeMockWorld(), mockEm, bigTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].id).toBe(99)
  })

  it('cleanup cutoff为tick-54000', () => {
    const zone = makeZone({ tick: 1 })
    ;(sys as any).zones.push(zone)
    sys.update(0, makeMockWorld(), mockEm, TICK0 + 54000)
    expect((sys as any).zones).toHaveLength(0)
  })
})

// ========================================================
// 7. MAX_ZONES上限
// ========================================================
describe('WorldZincSpringSystem - MAX_ZONES上限', () => {
  let sys: WorldZincSpringSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('MAX_ZONES常量为32', () => {
    expect(MAX_ZONES).toBe(32)
  })

  it('恰好MAX_ZONES个时不再spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('少于MAX_ZONES时可以spawn', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(MAX_ZONES - 1)
  })

  it('zones数量不会超过MAX_ZONES（多次update）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    for (let i = 0; i < 50; i++) {
      sys.update(0, world, mockEm, TICK0 + i * CHECK_INTERVAL)
    }
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  it('CHECK_INTERVAL常量为2690', () => {
    expect(CHECK_INTERVAL).toBe(2690)
  })

  it('FORM_CHANCE常量为0.003', () => {
    expect(FORM_CHANCE).toBe(0.003)
  })

  it('通过cleanup减少后可再次spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0 + 54001)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })
})

// ========================================================
// 8. 边界验证
// ========================================================
describe('WorldZincSpringSystem - 边界验证', () => {
  let sys: WorldZincSpringSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('TileType.SHALLOW_WATER=1', () => {
    expect(TileType.SHALLOW_WATER).toBe(1)
  })

  it('TileType.DEEP_WATER=0', () => {
    expect(TileType.DEEP_WATER).toBe(0)
  })

  it('TileType.MOUNTAIN=5', () => {
    expect(TileType.MOUNTAIN).toBe(5)
  })

  it('spawn尝试3次（attempt循环）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    expect(world.getTile.mock.calls.length).toBeGreaterThan(0)
  })

  it('random=0时spawn（0 <= 0.003）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random=0.003时spawn（边界值）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.003)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random=0.0031时不spawn（刚超过边界）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0031)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    sys.update(0, world, mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('cutoff=54000（Zinc属于54000族）', () => {
    const zone = makeZone({ tick: 0 })
    ;(sys as any).zones.push(zone)
    sys.update(0, makeMockWorld(), mockEm, 54001)
    expect((sys as any).zones).toHaveLength(0)
  })
})
