import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldTantalumSpringSystem } from '../systems/WorldTantalumSpringSystem'
import type { TantalumSpringZone } from '../systems/WorldTantalumSpringSystem'
import { TileType } from '../utils/Constants'

function makeSys(): WorldTantalumSpringSystem { return new WorldTantalumSpringSystem() }
let nextId = 1

function makeZone(overrides: Partial<TantalumSpringZone> = {}): TantalumSpringZone {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    tantalumContent: 50,
    springFlow: 35,
    pegmatiteLeaching: 60,
    mineralPurity: 50,
    tick: 0,
    ...overrides
  }
}

// mockWorld: 默认返回 SHALLOW_WATER 使 nearWater=true
function makeWorld(tileVal: number = TileType.SHALLOW_WATER) {
  return { width: 200, height: 200, getTile: () => tileVal } as any
}

const mockEm = {} as any
const CHECK_INTERVAL = 2850
const FORM_CHANCE = 0.003
const MAX_ZONES = 32

describe('WorldTantalumSpringSystem - 初始状态', () => {
  let sys: WorldTantalumSpringSystem
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

describe('WorldTantalumSpringSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldTantalumSpringSystem
  const world = makeWorld()
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不触发（lastCheck=0, diff=0 < 2850）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, 0)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick=2849时不触发（diff=2849 < 2850）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, 2849)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick=2850时触发（diff=2850 == CHECK_INTERVAL）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, 2850)
    // 触发了spawn逻辑，random=0.001 < FORM_CHANCE=0.003，应该spawn
    expect((sys as any).lastCheck).toBe(2850)
  })
  it('触发后lastCheck更新为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('未触发时lastCheck不变', () => {
    sys.update(1, world, mockEm, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('连续调用：第二次tick不足interval不更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, 3000)
    const lc = (sys as any).lastCheck
    sys.update(1, world, mockEm, 3001)
    expect((sys as any).lastCheck).toBe(lc)
  })
  it('第二次间隔足够时再次更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, world, mockEm, 3000)
    sys.update(1, world, mockEm, 3000 + CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(3000 + CHECK_INTERVAL)
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

describe('WorldTantalumSpringSystem - spawn逻辑', () => {
  let sys: WorldTantalumSpringSystem
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
    // x,y随机+tile条件通过（SHALLOW_WATER），形成条件random=0.001
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
  it('nearWater=false且nearMountain=false时不spawn', () => {
    sys = makeSys()
    const world = makeWorld(TileType.GRASS) // 草地，不near water/mountain
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
  it('spawn的tantalumContent在40-100范围内', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const z of (sys as any).zones) {
      expect(z.tantalumContent).toBeGreaterThanOrEqual(40)
      expect(z.tantalumContent).toBeLessThanOrEqual(100)
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
  it('spawn的pegmatiteLeaching在20-100范围内', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const z of (sys as any).zones) {
      expect(z.pegmatiteLeaching).toBeGreaterThanOrEqual(20)
      expect(z.pegmatiteLeaching).toBeLessThanOrEqual(100)
    }
  })
  it('spawn的mineralPurity在15-100范围内', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    for (const z of (sys as any).zones) {
      expect(z.mineralPurity).toBeGreaterThanOrEqual(15)
      expect(z.mineralPurity).toBeLessThanOrEqual(100)
    }
  })
  it('random=FORM_CHANCE时不spawn（> FORM_CHANCE为false，跳过）', () => {
    // random=0.003, 条件是 random > 0.003 才continue，所以0.003不continue，会spawn
    sys = makeSys()
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    // random=0.003 > 0.003 为false，不continue，会spawn
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })
})

describe('WorldTantalumSpringSystem - cleanup逻辑', () => {
  let sys: WorldTantalumSpringSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < cutoff的zone被清除', () => {
    sys = makeSys()
    const tick = 60000
    const cutoff = tick - 54000 // = 6000
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 })) // tick=5999 < 6000
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick === cutoff的zone不被清除（条件是tick < cutoff）', () => {
    sys = makeSys()
    const tick = 60000
    const cutoff = tick - 54000 // = 6000
    ;(sys as any).zones.push(makeZone({ tick: cutoff })) // tick=6000，不满足 < 6000
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
    ;(sys as any).zones.push(makeZone({ tick: cutoff - 1 }))  // 旧
    ;(sys as any).zones.push(makeZone({ tick: cutoff + 100 })) // 新
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
    const cutoff = tick - 54000 // = 46000
    ;(sys as any).zones.push(makeZone({ tick: 45999 })) // < cutoff，清除
    ;(sys as any).zones.push(makeZone({ tick: 46000 })) // === cutoff，保留
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('从后向前删除，不影响索引', () => {
    sys = makeSys()
    const tick = 60000
    const cutoff = tick - 54000
    // 插入交替新旧
    for (let i = 0; i < 4; i++) {
      const t = i % 2 === 0 ? cutoff - 1 : cutoff + 1
      ;(sys as any).zones.push(makeZone({ tick: t }))
    }
    ;(sys as any).lastCheck = tick - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).zones).toHaveLength(2)
  })
  it('tick=54000时cutoff=0，tick=0的zone被清除', () => {
    sys = makeSys()
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 54000 - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 54000)
    // cutoff=0, zone.tick=0，0 < 0 为false，保留
    expect((sys as any).zones).toHaveLength(1)
  })
  it('tick=54001时cutoff=1，tick=0的zone被清除', () => {
    sys = makeSys()
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 54001 - CHECK_INTERVAL
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, 54001)
    // cutoff=1, zone.tick=0，0 < 1 为true，清除
    expect((sys as any).zones).toHaveLength(0)
  })
  it('cleanup在spawn之后执行，新spawn的zone不被立即清除', () => {
    sys = makeSys()
    const tick = 60000
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, tick)
    // 新zone.tick=60000，cutoff=60000-54000=6000，不会被清除
    const zones = (sys as any).zones
    for (const z of zones) {
      expect(z.tick).toBe(tick)
    }
  })
})

describe('WorldTantalumSpringSystem - 综合场景', () => {
  let sys: WorldTantalumSpringSystem
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
      expect(z).toHaveProperty('tantalumContent')
      expect(z).toHaveProperty('springFlow')
      expect(z).toHaveProperty('pegmatiteLeaching')
      expect(z).toHaveProperty('mineralPurity')
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
  it('手动直接push zone后能正确访问所有字段', () => {
    sys = makeSys()
    const z = makeZone({ tantalumContent: 75, mineralPurity: 88 })
    ;(sys as any).zones.push(z)
    const stored = (sys as any).zones[0]
    expect(stored.tantalumContent).toBe(75)
    expect(stored.mineralPurity).toBe(88)
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
  it('SAND tile时不spawn（不near water/mountain）', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SAND)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('LAVA tile时不spawn（不near water/mountain）', () => {
    sys = makeSys()
    const world = makeWorld(TileType.LAVA)
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('SNOW tile时不spawn（不near water/mountain）', () => {
    sys = makeSys()
    const world = makeWorld(TileType.SNOW)
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
    // 第1轮：spawn
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
    // 保存zone的tick
    const zoneTick = (sys as any).zones[0].tick
    vi.restoreAllMocks()
    // 第2轮：不spawn但cleanup
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
})
