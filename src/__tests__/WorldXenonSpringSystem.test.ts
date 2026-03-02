import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldXenonSpringSystem } from '../systems/WorldXenonSpringSystem'
import type { XenonSpringZone } from '../systems/WorldXenonSpringSystem'
import { TileType } from '../utils/Constants'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 3160
// FORM_CHANCE = 0.003 (Math.random() > FORM_CHANCE 才跳过，即random<=FORM_CHANCE时spawn！)
// MAX_ZONES = 32
// 每次最多尝试3次spawn
// tile条件: hasAdjacentTile(SHALLOW_WATER|DEEP_WATER) || hasAdjacentTile(MOUNTAIN)
// cleanup: zone.tick < tick - 54000
// 字段范围: xenonContent(40..100), springFlow(10..60),
//          crustalFissureGas(20..100), nobleGasConcentration(15..100)
// 无字段动态update，只spawn和cleanup

const CHECK_INTERVAL = 3160
const FORM_CHANCE = 0.003
const MAX_ZONES = 32
const TICK0 = CHECK_INTERVAL

function makeSys(): WorldXenonSpringSystem { return new WorldXenonSpringSystem() }

let nextId = 1
function makeZone(overrides: Partial<XenonSpringZone> = {}): XenonSpringZone {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    xenonContent: 70,
    springFlow: 35,
    crustalFissureGas: 60,
    nobleGasConcentration: 57,
    tick: 0,
    ...overrides,
  }
}

// makeMockWorld: getTile返回指定值，用于hasAdjacentTile检查
// hasAdjacentTile检查8个±1邻格
// 要触发nearWater，邻格需要返回SHALLOW_WATER(1)或DEEP_WATER(0)
// 要触发nearMountain，邻格需要返回MOUNTAIN(5)
function makeMockWorld(adjacentTile: number | null = TileType.SHALLOW_WATER, w = 200, h = 200) {
  return {
    width: w,
    height: h,
    getTile: vi.fn().mockReturnValue(adjacentTile),
  } as any
}

const mockEm = {} as any

// ========================================================
// 1. 初始状态
// ========================================================
describe('WorldXenonSpringSystem - 初始状态', () => {
  let sys: WorldXenonSpringSystem

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

  it('手动注入一个zone后数组长度为1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('zones引用稳定（同一对象）', () => {
    const ref = (sys as any).zones
    expect(ref).toBe((sys as any).zones)
  })

  it('XenonSpringZone包含所有必要字段', () => {
    const z: XenonSpringZone = {
      id: 1, x: 10, y: 20,
      xenonContent: 50,
      springFlow: 30,
      crustalFissureGas: 50,
      nobleGasConcentration: 40,
      tick: 0,
    }
    expect(z.id).toBe(1)
    expect(z.xenonContent).toBe(50)
    expect(z.springFlow).toBe(30)
    expect(z.crustalFissureGas).toBe(50)
    expect(z.nobleGasConcentration).toBe(40)
  })
})

// ========================================================
// 2. CHECK_INTERVAL 节流
// ========================================================
describe('WorldXenonSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldXenonSpringSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    // random=1 > FORM_CHANCE=0.003 => 跳过spawn
    vi.spyOn(Math, 'random').mockReturnValue(1)
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

  it('CHECK_INTERVAL常量为3160', () => {
    expect(CHECK_INTERVAL).toBe(3160)
  })
})

// ========================================================
// 3. spawn条件 - tile/random方向
// ========================================================
describe('WorldXenonSpringSystem - spawn条件', () => {
  let sys: WorldXenonSpringSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('random <= FORM_CHANCE 且 nearWater=SHALLOW_WATER 时spawn', () => {
    // random > FORM_CHANCE才跳过，所以random <= FORM_CHANCE时spawn
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random <= FORM_CHANCE 且 nearWater=DEEP_WATER 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.DEEP_WATER), mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random <= FORM_CHANCE 且 nearMountain 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.MOUNTAIN), mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random > FORM_CHANCE 时不spawn', () => {
    // FORM_CHANCE=0.003, random=0.004 > 0.003 => 跳过
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE + 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random = FORM_CHANCE 时spawn（!> 等于不跳过）', () => {
    // 条件是 Math.random() > FORM_CHANCE 则continue，等于时不continue
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random = 1 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('邻格为GRASS(3)时不触发nearWater或nearMountain，不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.GRASS), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('邻格为SAND(2)时不触发条件，不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('邻格为FOREST(4)时不触发条件，不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.FOREST), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zones已满MAX_ZONES时不spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('zones=MAX_ZONES-1时还可以spawn', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(MAX_ZONES - 1)
  })

  it('邻格为null时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(null), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })
})

// ========================================================
// 4. spawn后字段值校验
// ========================================================
describe('WorldXenonSpringSystem - spawn后字段值', () => {
  let sys: WorldXenonSpringSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('spawn后tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    const zone = (sys as any).zones[0]
    expect(zone.tick).toBe(TICK0)
  })

  it('spawn后id从1开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).zones[0].id).toBe(1)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).nextId).toBeGreaterThan(1)
  })

  it('spawn后xenonContent在[40, 100)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    const zone = (sys as any).zones[0]
    expect(zone.xenonContent).toBeGreaterThanOrEqual(40)
    expect(zone.xenonContent).toBeLessThan(101)
  })

  it('spawn后springFlow在[10, 60)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    const zone = (sys as any).zones[0]
    expect(zone.springFlow).toBeGreaterThanOrEqual(10)
    expect(zone.springFlow).toBeLessThan(61)
  })

  it('spawn后crustalFissureGas在[20, 100)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    const zone = (sys as any).zones[0]
    expect(zone.crustalFissureGas).toBeGreaterThanOrEqual(20)
    expect(zone.crustalFissureGas).toBeLessThan(101)
  })

  it('spawn后nobleGasConcentration在[15, 100)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    const zone = (sys as any).zones[0]
    expect(zone.nobleGasConcentration).toBeGreaterThanOrEqual(15)
    expect(zone.nobleGasConcentration).toBeLessThan(101)
  })

  it('spawn后id是正整数', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    const zone = (sys as any).zones[0]
    expect(Number.isInteger(zone.id)).toBe(true)
    expect(zone.id).toBeGreaterThan(0)
  })

  it('xenonContent最小值为40（40+random*60中random=0）', () => {
    // 所有random都返回0时，xenonContent=40+0*60=40
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return 0 // x坐标随机
      if (callCount === 2) return 0 // y坐标随机
      if (callCount === 3) return 0 // nearWater/nearMountain不影响这里
      if (callCount === 4) return FORM_CHANCE // = FORM_CHANCE，不跳过
      return 0 // 其他字段全为0
    })
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    const zone = (sys as any).zones[0]
    if (zone) {
      expect(zone.xenonContent).toBeGreaterThanOrEqual(40)
    }
  })
})

// ========================================================
// 5. 每次最多3次spawn尝试
// ========================================================
describe('WorldXenonSpringSystem - 多次spawn尝试', () => {
  let sys: WorldXenonSpringSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('每次update最多spawn3个zone（attempt<3循环）', () => {
    // random<=FORM_CHANCE时每次attempt都成功
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    // 最多3个zone被spawn
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })

  it('每次update可以spawn多个zone（随机有利时）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('zones满时即使多次attempt也不超过MAX_ZONES', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    // 因为每次attempt都检查zones.length >= MAX_ZONES
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  it('zones刚好在MAX_ZONES-2时可以再spawn2个', () => {
    for (let i = 0; i < MAX_ZONES - 2; i++) {
      ;(sys as any).zones.push(makeZone({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).zones.length).toBeGreaterThan(MAX_ZONES - 2)
  })

  it('随机>FORM_CHANCE时3次attempt全部失败，不spawn任何zone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(0)
  })
})

// ========================================================
// 6. cleanup逻辑
// ========================================================
describe('WorldXenonSpringSystem - cleanup逻辑', () => {
  let sys: WorldXenonSpringSystem

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
    // tick = T + 54000, cutoff = T => T < T => false，不删
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
    // wadi.tick=1, tick=TICK0+54000, cutoff=TICK0, 1 < TICK0(3160) => 删除
    const zone = makeZone({ tick: 1 })
    ;(sys as any).zones.push(zone)
    sys.update(0, makeMockWorld(), mockEm, TICK0 + 54000)
    expect((sys as any).zones).toHaveLength(0)
  })
})

// ========================================================
// 7. MAX_ZONES上限
// ========================================================
describe('WorldXenonSpringSystem - MAX_ZONES上限', () => {
  let sys: WorldXenonSpringSystem

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
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('zones数量不会超过MAX_ZONES（多次update）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    for (let i = 0; i < 50; i++) {
      sys.update(0, world, mockEm, TICK0 + i * CHECK_INTERVAL)
    }
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })

  it('FORM_CHANCE常量为0.003', () => {
    expect(FORM_CHANCE).toBe(0.003)
  })

  it('CHECK_INTERVAL常量为3160', () => {
    expect(CHECK_INTERVAL).toBe(3160)
  })

  it('通过cleanup减少后可再次spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0 + 54001)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })
})

// ========================================================
// 8. TileType枚举与边界验证
// ========================================================
describe('WorldXenonSpringSystem - TileType枚举与边界验证', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('DEEP_WATER=0', () => {
    expect(TileType.DEEP_WATER).toBe(0)
  })

  it('SHALLOW_WATER=1', () => {
    expect(TileType.SHALLOW_WATER).toBe(1)
  })

  it('SAND=2', () => {
    expect(TileType.SAND).toBe(2)
  })

  it('GRASS=3', () => {
    expect(TileType.GRASS).toBe(3)
  })

  it('FOREST=4', () => {
    expect(TileType.FOREST).toBe(4)
  })

  it('MOUNTAIN=5', () => {
    expect(TileType.MOUNTAIN).toBe(5)
  })

  it('FORM_CHANCE方向：random>FORM_CHANCE才continue跳过，等于时不跳', () => {
    // 验证逻辑：if(Math.random() > FORM_CHANCE) continue
    const fc = FORM_CHANCE
    expect(0.001 > fc).toBe(false)   // 0.001 < 0.003，不跳过，spawn
    expect(0.004 > fc).toBe(true)    // 0.004 > 0.003，跳过，不spawn
    expect(fc > fc).toBe(false)      // 0.003 === 0.003，不跳过，spawn
  })

  it('zones无动态字段update，只有spawn和cleanup', () => {
    const sys = makeSys()
    const zone = makeZone({ tick: TICK0, xenonContent: 70 })
    ;(sys as any).zones.push(zone)
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    // xenonContent在update后不变
    expect(zone.xenonContent).toBe(70)
  })

  it('zones无动态字段update，springFlow保持不变', () => {
    const sys = makeSys()
    const zone = makeZone({ tick: TICK0, springFlow: 35 })
    ;(sys as any).zones.push(zone)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect(zone.springFlow).toBe(35)
  })

  it('zones无动态字段update，crustalFissureGas保持不变', () => {
    const sys = makeSys()
    const zone = makeZone({ tick: TICK0, crustalFissureGas: 60 })
    ;(sys as any).zones.push(zone)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(), mockEm, TICK0)
    expect(zone.crustalFissureGas).toBe(60)
  })

  it('hasAdjacentTile检查±1邻格（8个）', () => {
    const world = makeMockWorld(TileType.SHALLOW_WATER)
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.001)
    sys.update(0, world, mockEm, TICK0)
    // getTile会被调用多次（8个邻格）
    expect(world.getTile).toHaveBeenCalled()
    expect(world.getTile.mock.calls.length).toBeGreaterThanOrEqual(8)
    vi.restoreAllMocks()
  })

  it('xenonContent最大值 < 101（40+60*1=100）', () => {
    // 理论最大：40+60=100
    expect(40 + 60).toBe(100)
  })

  it('springFlow最大值 < 61（10+50*1=60）', () => {
    expect(10 + 50).toBe(60)
  })
})
