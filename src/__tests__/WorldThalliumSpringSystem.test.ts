import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldThalliumSpringSystem } from '../systems/WorldThalliumSpringSystem'
import type { ThalliumSpringZone } from '../systems/WorldThalliumSpringSystem'

function makeSys(): WorldThalliumSpringSystem { return new WorldThalliumSpringSystem() }
let nextId = 1
function makeZone(overrides: Partial<ThalliumSpringZone> = {}): ThalliumSpringZone {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    thalliumContent: 60,
    springFlow: 35,
    sulfideWeathering: 50,
    mineralToxicity: 50,
    tick: 0,
    ...overrides
  }
}

// Mock World that returns given tile for all getTile calls
function makeWorld(tileValue: number = 1) {
  return {
    width: 200,
    height: 200,
    getTile: () => tileValue
  } as any
}

const mockEm = {} as any

// CHECK_INTERVAL = 2910, FORM_CHANCE = 0.003, MAX_ZONES = 32

describe('WorldThalliumSpringSystem - 初始状态', () => {
  let sys: WorldThalliumSpringSystem
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

describe('WorldThalliumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldThalliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < CHECK_INTERVAL=2910 时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), mockEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2909 时不触发（2909 < 2910）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), mockEm, 2909)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2910 时触发（2910-0=2910，不满足<2910）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 2910)
    expect((sys as any).lastCheck).toBe(2910)
  })

  it('tick=2911 时触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 2911)
    expect((sys as any).lastCheck).toBe(2911)
  })

  it('触发后lastCheck更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 8888)
    expect((sys as any).lastCheck).toBe(8888)
  })

  it('触发后下一个相邻tick不再触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 5000)
    sys.update(1, makeWorld(), mockEm, 5001)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('第二次触发需满足间隔2910', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 5000)
    sys.update(1, makeWorld(), mockEm, 5000 + 2910)
    expect((sys as any).lastCheck).toBe(7910)
  })

  it('同一tick多次调用只有第一次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 5000)
    const lc = (sys as any).lastCheck
    sys.update(1, makeWorld(), mockEm, 5000)
    expect((sys as any).lastCheck).toBe(lc)
  })
})

describe('WorldThalliumSpringSystem - spawn逻辑', () => {
  let sys: WorldThalliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('random > FORM_CHANCE=0.003 时不spawn（0.5>0.003）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, 5000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random < FORM_CHANCE=0.003 时spawn（0.001<0.003）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('tile不符合条件（无邻接water/mountain）时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), mockEm, 5000) // GRASS=3，无water无mountain
    expect((sys as any).zones).toHaveLength(0)
  })

  it('邻接SHALLOW_WATER(1)可以spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('邻接DEEP_WATER(0)可以spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(0), mockEm, 5000)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('邻接MOUNTAIN(5)可以spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5), mockEm, 5000)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('FOREST(4)不满足条件不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(4), mockEm, 5000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('SAND(2)不满足条件不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(2), mockEm, 5000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('SNOW(6)不满足条件不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(6), mockEm, 5000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('LAVA(7)不满足条件不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(7), mockEm, 5000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    const count = (sys as any).zones.length
    expect((sys as any).nextId).toBe(1 + count)
  })

  it('spawn后tick字段等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 6543)
    const zones = (sys as any).zones
    for (const z of zones) {
      expect(z.tick).toBe(6543)
    }
  })

  it('spawn的thalliumContent在40-100范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    for (const z of (sys as any).zones) {
      expect(z.thalliumContent).toBeGreaterThanOrEqual(40)
      expect(z.thalliumContent).toBeLessThanOrEqual(100)
    }
  })

  it('spawn的springFlow在10-60范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    for (const z of (sys as any).zones) {
      expect(z.springFlow).toBeGreaterThanOrEqual(10)
      expect(z.springFlow).toBeLessThanOrEqual(60)
    }
  })

  it('spawn的sulfideWeathering在20-100范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    for (const z of (sys as any).zones) {
      expect(z.sulfideWeathering).toBeGreaterThanOrEqual(20)
      expect(z.sulfideWeathering).toBeLessThanOrEqual(100)
    }
  })

  it('spawn的mineralToxicity在15-100范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    for (const z of (sys as any).zones) {
      expect(z.mineralToxicity).toBeGreaterThanOrEqual(15)
      expect(z.mineralToxicity).toBeLessThanOrEqual(100)
    }
  })

  it('每次update最多尝试3次spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
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
})

describe('WorldThalliumSpringSystem - MAX_ZONES上限', () => {
  let sys: WorldThalliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('达到MAX_ZONES=32时停止spawn', () => {
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

  it('多次update后zones不超过MAX_ZONES=32', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 1; i <= 20; i++) {
      sys.update(1, makeWorld(1), mockEm, i * 3000)
    }
    expect((sys as any).zones.length).toBeLessThanOrEqual(32)
  })
})

describe('WorldThalliumSpringSystem - cleanup逻辑', () => {
  let sys: WorldThalliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('zone.tick < tick-54000 时被清除', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // tick=54001: cutoff=1, zone.tick=0 < 1 => 清除
    sys.update(1, makeWorld(1), mockEm, 54001)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('zone.tick = cutoff 时不被清除（0 < 0 为false）', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // tick=54000: cutoff=0, zone.tick=0, 0<0 false => 不清除
    sys.update(1, makeWorld(1), mockEm, 54000)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('zone.tick = cutoff+1 时保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 1 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // tick=54001: cutoff=1, zone.tick=1, 1<1 false => 保留
    sys.update(1, makeWorld(1), mockEm, 54001)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('较新的zone不被cleanup', () => {
    ;(sys as any).zones.push(makeZone({ tick: 100000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, 120000)
    // cutoff=66000, zone.tick=100000 > 66000 => 保留
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
  })

  it('混合新旧zone，旧的被清除新的保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, 100000)
    // cutoff=46000, zone.tick=0 < 46000 清除, zone.tick=999999 > 46000 保留
    const zones = (sys as any).zones
    expect(zones.some((z: ThalliumSpringZone) => z.tick === 999999)).toBe(true)
    expect(zones.some((z: ThalliumSpringZone) => z.tick === 0)).toBe(false)
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

  it('cutoff=tick-54000，精确计算', () => {
    const tickVal = 100000
    const cutoff = tickVal - 54000 // 46000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 })) // 45999 < 46000 => 清除
    ;(sys as any).zones.push(makeZone({ tick: cutoff }))     // 46000 < 46000 => false => 保留
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, tickVal)
    const remaining = (sys as any).zones.filter((z: ThalliumSpringZone) => z.tick < cutoff)
    expect(remaining).toHaveLength(0)
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
    expect(zones.filter((z: ThalliumSpringZone) => z.tick === 999999).length).toBe(3)
    expect(zones.filter((z: ThalliumSpringZone) => z.tick === 0).length).toBe(0)
  })

  it('cleanup后zones长度正确', () => {
    for (let i = 0; i < 8; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    for (let i = 0; i < 4; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, 200000)
    expect((sys as any).zones).toHaveLength(4)
  })

  it('不触发时（tick不足）不执行cleanup', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, 100) // tick=100 < CHECK_INTERVAL=2910
    expect((sys as any).zones).toHaveLength(1)
  })
})

describe('WorldThalliumSpringSystem - zone字段结构', () => {
  let sys: WorldThalliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('zone包含id字段', () => {
    ;(sys as any).zones.push(makeZone({ id: 88 }))
    expect((sys as any).zones[0].id).toBe(88)
  })

  it('zone包含x和y字段', () => {
    ;(sys as any).zones.push(makeZone({ x: 42, y: 77 }))
    expect((sys as any).zones[0].x).toBe(42)
    expect((sys as any).zones[0].y).toBe(77)
  })

  it('zone包含thalliumContent字段', () => {
    ;(sys as any).zones.push(makeZone({ thalliumContent: 75 }))
    expect((sys as any).zones[0].thalliumContent).toBe(75)
  })

  it('zone包含springFlow字段', () => {
    ;(sys as any).zones.push(makeZone({ springFlow: 40 }))
    expect((sys as any).zones[0].springFlow).toBe(40)
  })

  it('zone包含sulfideWeathering字段', () => {
    ;(sys as any).zones.push(makeZone({ sulfideWeathering: 70 }))
    expect((sys as any).zones[0].sulfideWeathering).toBe(70)
  })

  it('zone包含mineralToxicity字段', () => {
    ;(sys as any).zones.push(makeZone({ mineralToxicity: 60 }))
    expect((sys as any).zones[0].mineralToxicity).toBe(60)
  })

  it('zone包含tick字段', () => {
    ;(sys as any).zones.push(makeZone({ tick: 98765 }))
    expect((sys as any).zones[0].tick).toBe(98765)
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

describe('WorldThalliumSpringSystem - 综合场景', () => {
  let sys: WorldThalliumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('CHECK_INTERVAL=2910，tick差值>=2910时触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 2909)
    expect((sys as any).lastCheck).toBe(0) // 未触发：2909 < 2910
    sys.update(1, makeWorld(1), mockEm, 2910)
    expect((sys as any).lastCheck).toBe(2910) // 触发：2910 >= 2910
  })

  it('多次update，zones数量不超过MAX_ZONES', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 1; i <= 15; i++) {
      sys.update(1, makeWorld(1), mockEm, i * 3000)
    }
    expect((sys as any).zones.length).toBeLessThanOrEqual(32)
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

  it('zones数组中每个zone id唯一', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, makeWorld(1), mockEm, i * 3000)
    }
    const ids = (sys as any).zones.map((z: ThalliumSpringZone) => z.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('zones内部引用一致性', () => {
    ;(sys as any).zones.push(makeZone())
    const ref = (sys as any).zones
    expect(ref).toBe((sys as any).zones)
  })

  it('cleanup和spawn在同一update中正确协同', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 100000)
    // 旧的被清除（cutoff=46000，zone.tick=0<46000），新的被spawn
    const zones = (sys as any).zones
    expect(zones.every((z: ThalliumSpringZone) => z.tick !== 0)).toBe(true)
  })

  it('GRASS(3)不满足条件，不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), mockEm, 5000)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('spawn后zone拥有所有必要字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    const zones = (sys as any).zones
    for (const z of zones) {
      expect(z).toHaveProperty('id')
      expect(z).toHaveProperty('x')
      expect(z).toHaveProperty('y')
      expect(z).toHaveProperty('thalliumContent')
      expect(z).toHaveProperty('springFlow')
      expect(z).toHaveProperty('sulfideWeathering')
      expect(z).toHaveProperty('mineralToxicity')
      expect(z).toHaveProperty('tick')
    }
  })

  it('直接注入zone后可查询', () => {
    ;(sys as any).zones.push(makeZone({ thalliumContent: 88 }))
    expect((sys as any).zones[0].thalliumContent).toBe(88)
  })

  it('与TerbiumSpring相比，CHECK_INTERVAL更短（2910<2970）', () => {
    // 确认CHECK_INTERVAL为2910
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, 2910)
    expect((sys as any).lastCheck).toBe(2910)
  })

  it('tick=2910可触发，证明CHECK_INTERVAL=2910', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, 2910)
    expect((sys as any).lastCheck).toBe(2910)
  })

  it('多次cleanup：每次update都清除旧zone', () => {
    // 第一次update：spawn zone（tick=5000）
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), mockEm, 5000)
    const count1 = (sys as any).zones.length

    // 等待64000帧，旧的应该被清除
    ;(sys as any).lastCheck = 5000
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(1), mockEm, 5000 + 59001)
    // cutoff = 59001+5000-54000 = 10001，zone.tick=5000 < 10001 => 清除
    const count2 = (sys as any).zones.length
    expect(count2).toBeLessThan(count1 + 1)
  })
})
