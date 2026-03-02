import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTelluriumSpringSystem } from '../systems/WorldTelluriumSpringSystem'
import type { TelluriumSpringZone } from '../systems/WorldTelluriumSpringSystem'
import { TileType } from '../utils/Constants'

function makeSys(): WorldTelluriumSpringSystem { return new WorldTelluriumSpringSystem() }
let nextId = 1

function makeZone(overrides: Partial<TelluriumSpringZone> = {}): TelluriumSpringZone {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    telluriumContent: 50,
    springFlow: 35,
    goldTellurideWeathering: 60,
    metalloidConcentration: 50,
    tick: 0,
    ...overrides
  }
}

// mockWorld: 默认返回 SHALLOW_WATER 使 nearWater=true
function makeWorld(tileVal: number = TileType.SHALLOW_WATER) {
  return { width: 200, height: 200, getTile: () => tileVal } as any
}

const mockEm = {} as any
const CHECK_INTERVAL = 3150
const FORM_CHANCE = 0.003
const MAX_ZONES = 32

describe('WorldTelluriumSpringSystem - 初始状态', () => {
  let sys: WorldTelluriumSpringSystem
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
  it('手动注入zone后长度为1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
})

describe('WorldTelluriumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldTelluriumSpringSystem
  const world = makeWorld()
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不触发（lastCheck=0, diff=0 < 3150）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, 0)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick=3149时不触发（diff=3149 < 3150）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, 3149)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick=3150时触发（diff=3150 == CHECK_INTERVAL）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, 3150)
    expect((sys as any).lastCheck).toBe(3150)
  })
  it('触发后lastCheck更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, 4000)
    expect((sys as any).lastCheck).toBe(4000)
  })
  it('未触发时lastCheck不变', () => {
    sys.update(1, world, mockEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('连续调用：第二次tick不足interval不更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, 4000)
    const lc = (sys as any).lastCheck
    sys.update(1, world, mockEm, 4001)
    expect((sys as any).lastCheck).toBe(lc)
  })
  it('第二次间隔足够时再次更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, 4000)
    sys.update(1, world, mockEm, 4000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(4000 + CHECK_INTERVAL)
  })
  it('tick恰好等于lastCheck+CHECK_INTERVAL触发', () => {
    ;(sys as any).lastCheck = 5000
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, 5000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(5000 + CHECK_INTERVAL)
  })
  it('tick小于lastCheck+CHECK_INTERVAL不触发', () => {
    ;(sys as any).lastCheck = 5000
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, 5000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('dt参数不影响节流逻辑（基于tick而非dt）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(9999, world, mockEm, 100) // dt大但tick小
    expect((sys as any).lastCheck).toBe(0) // 不应触发
  })
})

describe('WorldTelluriumSpringSystem - spawn逻辑', () => {
  let sys: WorldTelluriumSpringSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('random > FORM_CHANCE时不spawn（random=0.5 > 0.003）', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('random < FORM_CHANCE时spawn（random=0.001 < 0.003）', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('nearWater=false且nearMountain=false时不spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.GRASS)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('nearMountain=true时允许spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('nearDeepWater=true时允许spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.DEEP_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('spawn后zone.tick等于当前tick', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('spawn后zone.id从1开始', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].id).toBe(1)
    }
  })
  it('spawn后nextId递增', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).nextId).toBeGreaterThan(1)
  })
  it('一次update最多spawn 3个（attempt限制）', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })
  it('zones达到MAX_ZONES=32时不再spawn', () => {
    sys = makeSys()
    for (let i = 0; i < 32; i++) {
      (sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBe(32)
  })
  it('zones=31时（小于MAX=32）仍可spawn', () => {
    sys = makeSys()
    for (let i = 0; i < 31; i++) {
      (sys as any).zones.push(makeZone({ tick: CHECK_INTERVAL }))
    }
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(31)
  })
  it('spawn的telluriumContent在40-100范围内', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const z of (sys as any).zones) {
      expect(z.telluriumContent).toBeGreaterThanOrEqual(40)
      expect(z.telluriumContent).toBeLessThanOrEqual(100)
    }
  })
  it('spawn的springFlow在10-60范围内', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const z of (sys as any).zones) {
      expect(z.springFlow).toBeGreaterThanOrEqual(10)
      expect(z.springFlow).toBeLessThanOrEqual(60)
    }
  })
  it('spawn的goldTellurideWeathering在20-100范围内', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const z of (sys as any).zones) {
      expect(z.goldTellurideWeathering).toBeGreaterThanOrEqual(20)
      expect(z.goldTellurideWeathering).toBeLessThanOrEqual(100)
    }
  })
  it('spawn的metalloidConcentration在15-100范围内', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const z of (sys as any).zones) {
      expect(z.metalloidConcentration).toBeGreaterThanOrEqual(15)
      expect(z.metalloidConcentration).toBeLessThanOrEqual(100)
    }
  })
  it('random=FORM_CHANCE时不被跳过（>0.003为false），会spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
})

describe('WorldTelluriumSpringSystem - cleanup逻辑', () => {
  let sys: WorldTelluriumSpringSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < cutoff的zone被清除', () => {
    sys = makeSys()
    const tick = 60000
    const cutoff = tick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick === cutoff的zone不被清除（条件是tick < cutoff）', () => {
    sys = makeSys()
    const tick = 60000
    const cutoff = tick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff }))
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('tick > cutoff的zone保留', () => {
    sys = makeSys()
    const tick = 60000
    const cutoff = tick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff + 100 }))
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('混合新旧zone：旧的清除，新的保留', () => {
    sys = makeSys()
    const tick = 60000
    const cutoff = tick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
    ;(sys as any).zones.push(makeZone({ tick: cutoff + 100 }))
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('全部zone都旧时清空', () => {
    sys = makeSys()
    const tick = 60000
    const cutoff = tick - 54000
    for (let i = 0; i < 5; i++) {
      (sys as any).zones.push(makeZone({ tick: cutoff - 100 }))
    }
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('cutoff=tick-54000：存活时间窗口正确', () => {
    sys = makeSys()
    const tick = 100000
    const cutoff = tick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
    ;(sys as any).zones.push(makeZone({ tick: cutoff }))
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('从后向前删除，不影响索引', () => {
    sys = makeSys()
    const tick = 60000
    const cutoff = tick - 54000
    for (let i = 0; i < 4; i++) {
      const t = i % 2 === 0 ? cutoff - 1 : cutoff + 1
      ;(sys as any).zones.push(makeZone({ tick: t }))
    }
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(2)
  })
  it('tick=54000时cutoff=0，zone.tick=0不满足 < 0，保留', () => {
    sys = makeSys()
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 54000 - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 54000)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('tick=54001时cutoff=1，zone.tick=0满足 < 1，清除', () => {
    sys = makeSys()
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 54001 - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 54001)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('cleanup在spawn之后执行，新spawn的zone不被立即清除', () => {
    sys = makeSys()
    const tick = 60000
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, tick)
    const zones = (sys as any).zones
    for (const z of zones) {
      expect(z.tick).toBe(tick)
    }
  })
})

describe('WorldTelluriumSpringSystem - 综合场景', () => {
  let sys: WorldTelluriumSpringSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('多次update间隔足够时可多次spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    const count1 = (sys as any).zones.length
    ;(sys as any).lastCheck = CHECK_INTERVAL
    sys.update(1, world, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).zones.length).toBeGreaterThan(count1)
  })
  it('zone字段全部存在', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const z of (sys as any).zones) {
      expect(z).toHaveProperty('id')
      expect(z).toHaveProperty('x')
      expect(z).toHaveProperty('y')
      expect(z).toHaveProperty('telluriumContent')
      expect(z).toHaveProperty('springFlow')
      expect(z).toHaveProperty('goldTellurideWeathering')
      expect(z).toHaveProperty('metalloidConcentration')
      expect(z).toHaveProperty('tick')
    }
  })
  it('zone.x在世界宽度范围内', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const z of (sys as any).zones) {
      expect(z.x).toBeGreaterThanOrEqual(0)
      expect(z.x).toBeLessThan(200)
    }
  })
  it('zone.y在世界高度范围内', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const z of (sys as any).zones) {
      expect(z.y).toBeGreaterThanOrEqual(0)
      expect(z.y).toBeLessThan(200)
    }
  })
  it('手动push zone后能正确访问所有字段', () => {
    sys = makeSys()
    const z = makeZone({ telluriumContent: 80, metalloidConcentration: 90 })
    ;(sys as any).zones.push(z)
    const stored = (sys as any).zones[0]
    expect(stored.telluriumContent).toBe(80)
    expect(stored.metalloidConcentration).toBe(90)
  })
  it('zones是独立数组引用，与sys绑定', () => {
    sys = makeSys()
    const ref1 = (sys as any).zones
    const ref2 = (sys as any).zones
    expect(ref1).toBe(ref2)
  })
  it('MAX_ZONES=32边界：第32个zone可以存在', () => {
    sys = makeSys()
    for (let i = 0; i < 32; i++) {
      (sys as any).zones.push(makeZone())
    }
    expect((sys as any).zones).toHaveLength(32)
  })
  it('SAND tile时不spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SAND)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('LAVA tile时不spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.LAVA)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('FOREST tile时不spawn（forest不是water/mountain）', () => {
    sys = makeSys()
    const world = makeWorld(TileType.FOREST)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('spawn后id连续递增', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    const zones = (sys as any).zones
    for (let i = 0; i < zones.length; i++) {
      expect(zones[i].id).toBe(i + 1)
    }
  })
  it('连续多轮spawn，id全局唯一递增', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    sys.update(1, world, mockEm, CHECK_INTERVAL * 2)
    const ids = (sys as any).zones.map((z: any) => z.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })
  it('tick非常大时cutoff正确，旧zone被清理', () => {
    sys = makeSys()
    const tick = 1000000
    const cutoff = tick - 54000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('zones.length从0→1→0的完整生命周期', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
    const zoneTick = (sys as any).zones[0].tick
    vi.restoreAllMocks()
    const laterTick = zoneTick + 54001
    ;(sys as any).lastCheck = laterTick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, laterTick)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('随机值刚好0（极端值）：< FORM_CHANCE，触发spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('随机值刚好1（极端值）：> FORM_CHANCE，不spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('lastCheck初始为0，tick=CHECK_INTERVAL-1不触发', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(TileType.MOUNTAIN), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('CHECK_INTERVAL为3150与Tantalum(2850)不同', () => {
    // 验证Tellurium系统有自己的CHECK_INTERVAL
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    // 2850-1=2849不触发
    sys.update(1, makeWorld(TileType.SHALLOW_WATER), mockEm, 2849)
    expect((sys as any).lastCheck).toBe(0)
    // 2850也不触发（3150-1=3149不足）
    sys.update(1, makeWorld(TileType.SHALLOW_WATER), mockEm, 3149)
    expect((sys as any).lastCheck).toBe(0)
    // 3150才触发
    sys.update(1, makeWorld(TileType.SHALLOW_WATER), mockEm, 3150)
    expect((sys as any).lastCheck).toBe(3150)
  })
})
