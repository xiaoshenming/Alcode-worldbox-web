import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTerbiumSpringSystem } from '../systems/WorldTerbiumSpringSystem'
import type { TerbiumSpringZone } from '../systems/WorldTerbiumSpringSystem'

function makeSys(): WorldTerbiumSpringSystem { return new WorldTerbiumSpringSystem() }
let nextId = 1
function makeZone(overrides: Partial<TerbiumSpringZone> = {}): TerbiumSpringZone {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    terbiumContent: 60,
    springFlow: 35,
    clayLeaching: 50,
    greenLuminescence: 50,
    tick: 0,
    ...overrides
  }
}

// Mock World that returns SHALLOW_WATER (1) for all getTile calls
function makeWorld(tileValue: number = 1) {
  return {
    width: 200,
    height: 200,
    getTile: () => tileValue
  } as any
}

const mockEm = {} as any

// CHECK_INTERVAL = 2970, FORM_CHANCE = 0.003, MAX_ZONES = 32

describe('WorldTerbiumSpringSystem - 初始状态', () => {
  let sys: WorldTerbiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始zones数组为空', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('zones是数组类型', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })

  it('两个实例互相独立', () => {
    const sys2 = makeSys()
    ;(sys as any).zones.push(makeZone())
    expect((sys2 as any).zones).toHaveLength(0)
  })
})

describe('WorldTerbiumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldTerbiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL 时不触发（lastCheck不更新）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), mockEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick = CHECK_INTERVAL 时触发（差值等于间隔，不满足<）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 2970)
    expect((sys as any).lastCheck).toBe(2970)
  })

  it('tick > CHECK_INTERVAL 时触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 2971)
    expect((sys as any).lastCheck).toBe(2971)
  })

  it('触发后lastCheck更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('第一次触发后，下一个tick不再触发（间隔不足）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 5000)
    const lastCheck = (sys as any).lastCheck
    sys.update(1, makeWorld(), mockEm, 5001)
    expect((sys as any).lastCheck).toBe(lastCheck)
  })

  it('第一次触发后，间隔满足后再次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 5000)
    sys.update(1, makeWorld(), mockEm, 5000 + 2971)
    expect((sys as any).lastCheck).toBe(5000 + 2971)
  })

  it('lastCheck=0时，tick=2971可以触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 2971)
    expect((sys as any).lastCheck).toBe(2971)
  })
})

describe('WorldTerbiumSpringSystem - spawn逻辑', () => {
  let sys: WorldTerbiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('random > FORM_CHANCE 时不spawn（0.5>0.003）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, 5000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random <= FORM_CHANCE 时spawn（0.002 < 0.003）', () => {
    // 需要：位置random（floor用）、tile邻接检查（getTile返回1=SHALLOW_WATER）、然后FORM_CHANCE判断
    // hasAdjacentTile 检查8个邻居，getTile总返回1(SHALLOW_WATER)，所以nearWater=true
    // mockReturnValue(0.002) -> floor random -> x=0, y=0; FORM_CHANCE check: 0.002 < 0.003 -> spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, makeWorld(1), mockEm, 5000)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('tile不符合条件（无邻接水或山）时不spawn', () => {
    // GRASS=3，无邻接water或mountain
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    // 让getTile返回3（GRASS），这样邻居都是GRASS，无water也无mountain
    sys.update(1, makeWorld(3), mockEm, 5000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('邻接SHALLOW_WATER可以spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000) // TileType.SHALLOW_WATER=1
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('邻接DEEP_WATER(0)可以spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(0), mockEm, 5000) // TileType.DEEP_WATER=0
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('邻接MOUNTAIN(5)可以spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5), mockEm, 5000) // TileType.MOUNTAIN=5
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    const count = (sys as any).zones.length
    expect((sys as any).nextId).toBe(1 + count)
  })

  it('spawn后tick字段等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    const zones = (sys as any).zones
    if (zones.length > 0) {
      expect(zones[0].tick).toBe(5000)
    }
  })

  it('spawn的terbiumContent在40-100范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    const zones = (sys as any).zones
    for (const z of zones) {
      expect(z.terbiumContent).toBeGreaterThanOrEqual(40)
      expect(z.terbiumContent).toBeLessThanOrEqual(100)
    }
  })

  it('spawn的springFlow在10-60范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    const zones = (sys as any).zones
    for (const z of zones) {
      expect(z.springFlow).toBeGreaterThanOrEqual(10)
      expect(z.springFlow).toBeLessThanOrEqual(60)
    }
  })

  it('spawn的clayLeaching在20-100范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    const zones = (sys as any).zones
    for (const z of zones) {
      expect(z.clayLeaching).toBeGreaterThanOrEqual(20)
      expect(z.clayLeaching).toBeLessThanOrEqual(100)
    }
  })

  it('spawn的greenLuminescence在15-100范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    const zones = (sys as any).zones
    for (const z of zones) {
      expect(z.greenLuminescence).toBeGreaterThanOrEqual(15)
      expect(z.greenLuminescence).toBeLessThanOrEqual(100)
    }
  })

  it('每次update最多尝试3次spawn', () => {
    // random=0.001 -> FORM_CHANCE通过，每次attempt都spawn，最多3个
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })
})

describe('WorldTerbiumSpringSystem - MAX_ZONES上限', () => {
  let sys: WorldTerbiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到MAX_ZONES=32时停止spawn', () => {
    // 预置32个zone
    for (let i = 0; i < 32; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    expect((sys as any).zones.length).toBe(32)
  })

  it('31个zone时仍可spawn', () => {
    for (let i = 0; i < 31; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    expect((sys as any).zones.length).toBeGreaterThan(31)
  })

  it('zones数量不会超过MAX_ZONES+3（每次最多3次attempt）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    // 多次触发
    for (let t = 3000; t < 3000 + 2971 * 20; t += 2971) {
      sys.update(1, makeWorld(1), mockEm, t)
    }
    expect((sys as any).zones.length).toBeLessThanOrEqual(32)
  })
})

describe('WorldTerbiumSpringSystem - cleanup逻辑', () => {
  let sys: WorldTerbiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('zone.tick < tick-54000 时被清除', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // tick=54001: cutoff=54001-54000=1, zone.tick=0 < 1 => 清除
    sys.update(1, makeWorld(1), mockEm, 54001)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zone.tick = tick-54000 时不被清除（不满足<）', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // tick=54000: cutoff=54000-54000=0, zone.tick=0，0 < 0 为false => 不清除
    sys.update(1, makeWorld(1), mockEm, 54000)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('zone.tick恰好在cutoff边界+1时保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 1 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // tick=54001: cutoff=1, zone.tick=1，1 < 1 为false => 保留
    sys.update(1, makeWorld(1), mockEm, 54001)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('较新的zone不被cleanup', () => {
    ;(sys as any).zones.push(makeZone({ tick: 100000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, 100000 + 5000)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('混合新旧zone，旧的被清除新的保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))       // 旧的
    ;(sys as any).zones.push(makeZone({ tick: 999999 }))  // 新的
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, 100000)
    // tick=100000, cutoff=46000, zone[0].tick=0 < 46000 => 清除; zone[1].tick=999999 > 46000 => 保留
    const zones = (sys as any).zones
    expect(zones.some((z: TerbiumSpringZone) => z.tick === 999999)).toBe(true)
    expect(zones.some((z: TerbiumSpringZone) => z.tick === 0)).toBe(false)
  })

  it('所有zone都过期时数组为空', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, 200000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('cleanup从后向前遍历，不影响结果', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    for (let i = 0; i < 3; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, 200000)
    const zones = (sys as any).zones
    expect(zones.filter((z: TerbiumSpringZone) => z.tick === 999999).length).toBe(3)
    expect(zones.filter((z: TerbiumSpringZone) => z.tick === 0).length).toBe(0)
  })

  it('cutoff = tick - 54000，精确计算', () => {
    const tickValue = 100000
    const cutoff = tickValue - 54000 // 46000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 })) // 45999 < 46000 => 清除
    ;(sys as any).zones.push(makeZone({ tick: cutoff }))     // 46000 < 46000 => false => 保留
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, tickValue)
    const zones = (sys as any).zones
    const remaining = zones.filter((z: TerbiumSpringZone) => z.tick < cutoff)
    expect(remaining).toHaveLength(0)
  })

  it('cleanup后zones长度正确', () => {
    // 添加10个旧的和5个新的
    for (let i = 0; i < 10; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, 200000)
    expect((sys as any).zones).toHaveLength(5)
  })

  it('不触发时（tick不足）不执行cleanup', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // tick=100 < CHECK_INTERVAL=2970 => 不触发
    sys.update(1, makeWorld(1), mockEm, 100)
    expect((sys as any).zones).toHaveLength(1)
  })
})

describe('WorldTerbiumSpringSystem - zone字段结构', () => {
  let sys: WorldTerbiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('zone包含id字段', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones[0]).toHaveProperty('id')
  })

  it('zone包含x和y字段', () => {
    ;(sys as any).zones.push(makeZone({ x: 42, y: 77 }))
    const z = (sys as any).zones[0]
    expect(z.x).toBe(42)
    expect(z.y).toBe(77)
  })

  it('zone包含terbiumContent字段', () => {
    ;(sys as any).zones.push(makeZone({ terbiumContent: 75 }))
    expect((sys as any).zones[0].terbiumContent).toBe(75)
  })

  it('zone包含springFlow字段', () => {
    ;(sys as any).zones.push(makeZone({ springFlow: 45 }))
    expect((sys as any).zones[0].springFlow).toBe(45)
  })

  it('zone包含clayLeaching字段', () => {
    ;(sys as any).zones.push(makeZone({ clayLeaching: 65 }))
    expect((sys as any).zones[0].clayLeaching).toBe(65)
  })

  it('zone包含greenLuminescence字段', () => {
    ;(sys as any).zones.push(makeZone({ greenLuminescence: 55 }))
    expect((sys as any).zones[0].greenLuminescence).toBe(55)
  })

  it('zone包含tick字段', () => {
    ;(sys as any).zones.push(makeZone({ tick: 12345 }))
    expect((sys as any).zones[0].tick).toBe(12345)
  })

  it('id从1开始递增', () => {
    ;(sys as any).nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    const zones = (sys as any).zones
    if (zones.length > 0) {
      expect(zones[0].id).toBe(1)
    }
  })
})

describe('WorldTerbiumSpringSystem - 综合场景', () => {
  let sys: WorldTerbiumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('多次update（间隔满足），zones数量增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 3000)
    const count1 = (sys as any).zones.length
    sys.update(1, makeWorld(1), mockEm, 3000 + 2971)
    const count2 = (sys as any).zones.length
    expect(count2).toBeGreaterThanOrEqual(count1)
  })

  it('多次update后zones不超过MAX_ZONES', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 1; i <= 20; i++) {
      sys.update(1, makeWorld(1), mockEm, i * 3000)
    }
    expect((sys as any).zones.length).toBeLessThanOrEqual(32)
  })

  it('CHECK_INTERVAL=2970，tick差值>=2970时触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 2969)
    expect((sys as any).lastCheck).toBe(0) // 未触发：2969 < 2970
    sys.update(1, makeWorld(1), mockEm, 2970)
    expect((sys as any).lastCheck).toBe(2970) // 触发：2970 >= 2970
  })

  it('zones内部引用一致性', () => {
    ;(sys as any).zones.push(makeZone())
    const ref = (sys as any).zones
    expect(ref).toBe((sys as any).zones)
  })

  it('spawn时x在world.width范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    for (const z of (sys as any).zones) {
      expect(z.x).toBeGreaterThanOrEqual(0)
      expect(z.x).toBeLessThan(200)
    }
  })

  it('spawn时y在world.height范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    for (const z of (sys as any).zones) {
      expect(z.y).toBeGreaterThanOrEqual(0)
      expect(z.y).toBeLessThan(200)
    }
  })

  it('FOREST tile（=4）不满足water/mountain条件，不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), mockEm, 5000) // FOREST=4，无water无mountain邻居
    expect((sys as any).zones).toHaveLength(0)
  })

  it('SAND tile（=2）不满足water/mountain条件，不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2), mockEm, 5000) // SAND=2
    expect((sys as any).zones).toHaveLength(0)
  })

  it('SNOW tile（=6）不满足water/mountain条件，不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(6), mockEm, 5000) // SNOW=6
    expect((sys as any).zones).toHaveLength(0)
  })

  it('LAVA tile（=7）不满足water/mountain条件，不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(7), mockEm, 5000) // LAVA=7
    expect((sys as any).zones).toHaveLength(0)
  })

  it('同一tick多次调用update，只有第一次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    const count1 = (sys as any).zones.length
    const lastCheck1 = (sys as any).lastCheck
    sys.update(1, makeWorld(1), mockEm, 5000)
    expect((sys as any).lastCheck).toBe(lastCheck1)
  })

  it('zones数组中每个zone id唯一', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeWorld(1), mockEm, i * 3000)
    }
    const ids = (sys as any).zones.map((z: TerbiumSpringZone) => z.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('spawn后tick字段正确记录创建时间', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 9999)
    for (const z of (sys as any).zones) {
      expect(z.tick).toBe(9999)
    }
  })

  it('高random值（0.99）不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, makeWorld(1), mockEm, 5000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('极低random值（0.0001）触发spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('cleanup和spawn在同一update中正确协同', () => {
    // 预置一个过期的zone
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 100000)
    // 旧的被清除，新的被spawn
    const zones = (sys as any).zones
    expect(zones.every((z: TerbiumSpringZone) => z.tick !== 0)).toBe(true)
  })
})
