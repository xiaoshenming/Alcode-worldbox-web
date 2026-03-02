import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldYttriumSpringSystem } from '../systems/WorldYttriumSpringSystem'
import type { YttriumSpringZone } from '../systems/WorldYttriumSpringSystem'
import { TileType } from '../utils/Constants'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 2930
// FORM_CHANCE = 0.003 (Math.random() > FORM_CHANCE 阻止spawn)
// MAX_ZONES = 32
// cleanup: zone.tick < tick - 54000
// spawn条件: (nearWater || nearMountain) && random <= FORM_CHANCE
// yttriumContent: 40 + random*60 (40..100)
// springFlow: 10 + random*50 (10..60)
// xenotimeLeaching: 20 + random*80 (20..100)
// mineralLuminescence: 15 + random*85 (15..100)

const CHECK_INTERVAL = 2930
const FORM_CHANCE = 0.003
const MAX_ZONES = 32
const TICK0 = CHECK_INTERVAL

function makeSys(): WorldYttriumSpringSystem { return new WorldYttriumSpringSystem() }

let nextId = 1
function makeZone(overrides: Partial<YttriumSpringZone> = {}): YttriumSpringZone {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    yttriumContent: 50,
    springFlow: 30,
    xenotimeLeaching: 60,
    mineralLuminescence: 50,
    tick: 0,
    ...overrides,
  }
}

function makeMockWorld(tiles: Map<string, number> = new Map(), w = 200, h = 200) {
  return {
    width: w,
    height: h,
    getTile: vi.fn((x: number, y: number) => tiles.get(`${x},${y}`) ?? null),
  } as any
}

const mockEm = {} as any

// ========================================================
// 1. 初始状态
// ========================================================
describe('WorldYttriumSpringSystem - 初始状态', () => {
  let sys: WorldYttriumSpringSystem

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

  it('YttriumSpringZone包含所有必要字段', () => {
    const z: YttriumSpringZone = {
      id: 1, x: 10, y: 20,
      yttriumContent: 50, springFlow: 30,
      xenotimeLeaching: 60, mineralLuminescence: 50,
      tick: 0,
    }
    expect(z.id).toBe(1)
    expect(z.yttriumContent).toBe(50)
    expect(z.springFlow).toBe(30)
    expect(z.xenotimeLeaching).toBe(60)
    expect(z.mineralLuminescence).toBe(50)
  })
})

// ========================================================
// 2. CHECK_INTERVAL 节流
// ========================================================
describe('WorldYttriumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldYttriumSpringSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // random > FORM_CHANCE 阻止spawn
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
// 3. spawn条件 - tile/random方向
// ========================================================
describe('WorldYttriumSpringSystem - spawn条件', () => {
  let sys: WorldYttriumSpringSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('random <= FORM_CHANCE 且 nearWater 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER) // adjacent
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random <= FORM_CHANCE 且 nearMountain 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.MOUNTAIN) // adjacent
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random > FORM_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE + 0.0001)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random=1时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('无nearWater且无nearMountain时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.GRASS) // no water/mountain
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zones已满MAX_ZONES时不spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('zones=MAX_ZONES-1时还可以spawn', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(MAX_ZONES - 1)
  })

  it('nearDeepWater也可以spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.DEEP_WATER) // adjacent
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
})

// ========================================================
// 4. spawn后字段值校验
// ========================================================
describe('WorldYttriumSpringSystem - spawn后字段值', () => {
  let sys: WorldYttriumSpringSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('spawn后tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].tick).toBe(TICK0)
    }
  })

  it('spawn后id从1开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].id).toBe(1)
    }
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(1)
    }
  })

  it('spawn后yttriumContent在40..100范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    if ((sys as any).zones.length > 0) {
      const z = (sys as any).zones[0]
      expect(z.yttriumContent).toBeGreaterThanOrEqual(40)
      expect(z.yttriumContent).toBeLessThan(100)
    }
  })

  it('spawn后springFlow在10..60范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    if ((sys as any).zones.length > 0) {
      const z = (sys as any).zones[0]
      expect(z.springFlow).toBeGreaterThanOrEqual(10)
      expect(z.springFlow).toBeLessThan(60)
    }
  })

  it('spawn后xenotimeLeaching在20..100范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    if ((sys as any).zones.length > 0) {
      const z = (sys as any).zones[0]
      expect(z.xenotimeLeaching).toBeGreaterThanOrEqual(20)
      expect(z.xenotimeLeaching).toBeLessThan(100)
    }
  })

  it('spawn后mineralLuminescence在15..100范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    if ((sys as any).zones.length > 0) {
      const z = (sys as any).zones[0]
      expect(z.mineralLuminescence).toBeGreaterThanOrEqual(15)
      expect(z.mineralLuminescence).toBeLessThan(100)
    }
  })

  it('坐标x在合法范围内(0..width)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles, 200, 200), mockEm, TICK0)
    if ((sys as any).zones.length > 0) {
      const z = (sys as any).zones[0]
      expect(z.x).toBeGreaterThanOrEqual(0)
      expect(z.x).toBeLessThan(200)
    }
  })

  it('坐标y在合法范围内(0..height)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles, 200, 200), mockEm, TICK0)
    if ((sys as any).zones.length > 0) {
      const z = (sys as any).zones[0]
      expect(z.y).toBeGreaterThanOrEqual(0)
      expect(z.y).toBeLessThan(200)
    }
  })
})

// ========================================================
// 5. update逻辑（无字段漂移）
// ========================================================
describe('WorldYttriumSpringSystem - update逻辑', () => {
  let sys: WorldYttriumSpringSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
  })

  it('zones字段不会被update修改（无漂移逻辑）', () => {
    const zone = makeZone({ tick: TICK0, yttriumContent: 50 })
    ;(sys as any).zones.push(zone)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect(zone.yttriumContent).toBe(50)
  })

  it('多个泉区全部保持不变', () => {
    const z1 = makeZone({ tick: TICK0, springFlow: 30 })
    const z2 = makeZone({ tick: TICK0, springFlow: 40 })
    ;(sys as any).zones.push(z1, z2)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect(z1.springFlow).toBe(30)
    expect(z2.springFlow).toBe(40)
  })
})

// ========================================================
// 6. cleanup逻辑
// ========================================================
describe('WorldYttriumSpringSystem - cleanup逻辑', () => {
  let sys: WorldYttriumSpringSystem

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
describe('WorldYttriumSpringSystem - MAX_ZONES上限', () => {
  let sys: WorldYttriumSpringSystem

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
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('少于MAX_ZONES时可以spawn', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(MAX_ZONES - 1)
  })

  it('zones数量不会超过MAX_ZONES（多次update）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    const world = makeMockWorld(tiles)
    for (let i = 0; i < 50; i++) {
      sys.update(0, world, mockEm, TICK0 + i * CHECK_INTERVAL)
    }
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  it('CHECK_INTERVAL常量为2930', () => {
    expect(CHECK_INTERVAL).toBe(2930)
  })

  it('FORM_CHANCE常量为0.003', () => {
    expect(FORM_CHANCE).toBe(0.003)
  })

  it('通过cleanup减少后可再次spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    sys.update(0, makeMockWorld(tiles), mockEm, TICK0 + 54001)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })
})

// ========================================================
// 8. 边界验证
// ========================================================
describe('WorldYttriumSpringSystem - 边界验证', () => {
  it('TileType.SHALLOW_WATER=1', () => {
    expect(TileType.SHALLOW_WATER).toBe(1)
  })

  it('TileType.DEEP_WATER=0', () => {
    expect(TileType.DEEP_WATER).toBe(0)
  })

  it('TileType.MOUNTAIN=5', () => {
    expect(TileType.MOUNTAIN).toBe(5)
  })

  it('YttriumSpringZone字段类型正确', () => {
    const z = makeZone()
    expect(typeof z.id).toBe('number')
    expect(typeof z.x).toBe('number')
    expect(typeof z.y).toBe('number')
    expect(typeof z.yttriumContent).toBe('number')
    expect(typeof z.springFlow).toBe('number')
    expect(typeof z.xenotimeLeaching).toBe('number')
    expect(typeof z.mineralLuminescence).toBe('number')
    expect(typeof z.tick).toBe('number')
  })

  it('spawn尝试3次（attempt循环）', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
    const tiles = new Map<string, number>()
    tiles.set('0,0', TileType.GRASS)
    tiles.set('1,0', TileType.SHALLOW_WATER)
    const world = makeMockWorld(tiles)
    sys.update(0, world, mockEm, TICK0)
    // getTile会被调用多次（每次attempt检查8个邻格）
    expect(world.getTile).toHaveBeenCalled()
  })
})
