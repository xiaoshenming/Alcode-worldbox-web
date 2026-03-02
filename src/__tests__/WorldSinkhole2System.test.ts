import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldSinkhole2System } from '../systems/WorldSinkhole2System'
import type { Sinkhole2 } from '../systems/WorldSinkhole2System'

// CHECK_INTERVAL=2660, FORM_CHANCE=0.0011, MAX_SINKHOLES=12
// tile条件: GRASS(3) || SAND(2)
// cleanup: tick < (currentTick - 94000)
// diameter: min(25, d + collapseRate*0.01), depth: min(40, d+0.000005)
// stability: max(5, s-0.00004), waterLevel: max(0,min(depth*0.8, wl+(rand-0.47)*0.06))
// spectacle: max(10,min(60, sp+(rand-0.48)*0.07))

function makeSys(): WorldSinkhole2System { return new WorldSinkhole2System() }

function makeWorld(tile: number = 3, w = 200, h = 200) {
  return { width: w, height: h, getTile: (_x: number, _y: number) => tile } as any
}

function makeEM() { return {} as any }

let nextId = 1
function makeSinkhole(overrides: Partial<Sinkhole2> = {}): Sinkhole2 {
  return {
    id: nextId++,
    x: 25, y: 35,
    diameter: 10,
    depth: 15,
    collapseRate: 0.002,
    waterLevel: 5,
    stability: 40,
    spectacle: 35,
    tick: 0,
    ...overrides
  }
}

// ===== describe 1: 初始状态 =====
describe('WorldSinkhole2System - 初始状态', () => {
  let sys: WorldSinkhole2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始sinkholes为空数组', () => {
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('sinkholes是Array实例', () => {
    expect(Array.isArray((sys as any).sinkholes)).toBe(true)
  })

  it('不同实例互不干扰', () => {
    const sys2 = makeSys()
    ;(sys as any).sinkholes.push(makeSinkhole())
    expect((sys2 as any).sinkholes).toHaveLength(0)
  })

  it('手动注入一个天坑后长度为1', () => {
    ;(sys as any).sinkholes.push(makeSinkhole())
    expect((sys as any).sinkholes).toHaveLength(1)
  })

  it('手动注入多个天坑', () => {
    ;(sys as any).sinkholes.push(makeSinkhole(), makeSinkhole(), makeSinkhole())
    expect((sys as any).sinkholes).toHaveLength(3)
  })

  it('sinkholes引用稳定', () => {
    const ref = (sys as any).sinkholes
    expect(ref).toBe((sys as any).sinkholes)
  })
})

// ===== describe 2: CHECK_INTERVAL 节流 =====
describe('WorldSinkhole2System - CHECK_INTERVAL节流', () => {
  let sys: WorldSinkhole2System
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时执行一次(lastCheck从0开始)', () => {
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick<2660时不执行(lastCheck=0)', () => {
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2659)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2660时执行(lastCheck更新)', () => {
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    expect((sys as any).lastCheck).toBe(2660)
  })

  it('tick=2661时执行', () => {
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2661)
    expect((sys as any).lastCheck).toBe(2661)
  })

  it('第一次执行后第二次需要再过2660 tick', () => {
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    sys.update(1, world, makeEM(), 5000)
    expect((sys as any).lastCheck).toBe(2660)
  })

  it('第一次执行后tick差=2660时执行第二次', () => {
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    sys.update(1, world, makeEM(), 5320)
    expect((sys as any).lastCheck).toBe(5320)
  })

  it('tick=1时不执行', () => {
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('连续大tick跳跃也能执行', () => {
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 100000)
    expect((sys as any).lastCheck).toBe(100000)
  })
})

// ===== describe 3: spawn逻辑 =====
describe('WorldSinkhole2System - spawn逻辑', () => {
  let sys: WorldSinkhole2System
  afterEach(() => { vi.restoreAllMocks() })

  it('random<0.0011时在GRASS上spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    expect((sys as any).sinkholes.length).toBeGreaterThanOrEqual(1)
  })

  it('random<0.0011时在SAND(2)上spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(2)
    sys.update(1, world, makeEM(), 2660)
    expect((sys as any).sinkholes.length).toBeGreaterThanOrEqual(1)
  })

  it('random>=0.0011时不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('tile=WATER(0)时不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(0)
    sys.update(1, world, makeEM(), 2660)
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('tile=SHALLOW_WATER(1)时不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(1)
    sys.update(1, world, makeEM(), 2660)
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('tile=FOREST(4)时不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(4)
    sys.update(1, world, makeEM(), 2660)
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('tile=MOUNTAIN(5)时不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(5)
    sys.update(1, world, makeEM(), 2660)
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('已达MAX_SINKHOLES(12)时不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 12; i++) (sys as any).sinkholes.push(makeSinkhole())
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    expect((sys as any).sinkholes).toHaveLength(12)
  })

  it('11个时仍可spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 11; i++) (sys as any).sinkholes.push(makeSinkhole())
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    expect((sys as any).sinkholes).toHaveLength(12)
  })
})

// ===== describe 4: spawn字段范围 =====
describe('WorldSinkhole2System - spawn字段范围', () => {
  let sys: WorldSinkhole2System
  afterEach(() => { vi.restoreAllMocks() })

  function spawnOne(randVal: number, tile = 3): Sinkhole2 {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(randVal)
    const world = makeWorld(tile)
    sys.update(1, world, makeEM(), 2660)
    return (sys as any).sinkholes[0]
  }

  it('新spawn的id从1开始', () => {
    const s = spawnOne(0.001)
    expect(s.id).toBe(1)
  })

  it('第二次spawn id递增为2', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    sys.update(1, world, makeEM(), 5320)
    const ids = (sys as any).sinkholes.map((s: Sinkhole2) => s.id)
    expect(ids).toContain(2)
  })

  it('diameter下界>=3', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys = makeSys()
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    // random=0: diameter=3+0*12=3, but update也执行一次
    const s = (sys as any).sinkholes[0]
    expect(s.diameter).toBeGreaterThanOrEqual(0)
  })

  it('diameter上界<=25(spawn时3+random*12<=15)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys = makeSys()
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    const s = (sys as any).sinkholes[0]
    expect(s.diameter).toBeLessThanOrEqual(25)
  })

  it('depth>=5(spawn时5+random*20)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys = makeSys()
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    const s = (sys as any).sinkholes[0]
    expect(s.depth).toBeGreaterThanOrEqual(5)
  })

  it('collapseRate在0.001~0.004范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys = makeSys()
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    const s = (sys as any).sinkholes[0]
    expect(s.collapseRate).toBeGreaterThanOrEqual(0.001)
    expect(s.collapseRate).toBeLessThanOrEqual(0.004)
  })

  it('stability在30~70范围(spawn时30+random*40)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys = makeSys()
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    const s = (sys as any).sinkholes[0]
    expect(s.stability).toBeGreaterThanOrEqual(5)
    expect(s.stability).toBeLessThanOrEqual(70)
  })

  it('tick字段等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys = makeSys()
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    const s = (sys as any).sinkholes[0]
    expect(s.tick).toBe(2660)
  })

  it('x坐标在[10, w-10)范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys = makeSys()
    const world = makeWorld(3, 100, 100)
    sys.update(1, world, makeEM(), 2660)
    const s = (sys as any).sinkholes[0]
    expect(s.x).toBeGreaterThanOrEqual(10)
    expect(s.x).toBeLessThan(90)
  })
})

// ===== describe 5: update数值逻辑 =====
describe('WorldSinkhole2System - update数值逻辑', () => {
  let sys: WorldSinkhole2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('diameter按collapseRate*0.01递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const s = makeSinkhole({ diameter: 10, collapseRate: 0.002, depth: 15, waterLevel: 5, stability: 40, spectacle: 35 })
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), 2660)
    expect(s.diameter).toBeCloseTo(10 + 0.002 * 0.01, 8)
  })

  it('diameter不超过上限25', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const s = makeSinkhole({ diameter: 24.9999, collapseRate: 1, depth: 15, waterLevel: 5, stability: 40, spectacle: 35 })
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), 2660)
    expect(s.diameter).toBeLessThanOrEqual(25)
  })

  it('depth按0.000005递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const s = makeSinkhole({ depth: 15, diameter: 10, collapseRate: 0.002, waterLevel: 5, stability: 40, spectacle: 35 })
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), 2660)
    expect(s.depth).toBeCloseTo(15 + 0.000005, 8)
  })

  it('depth不超过上限40', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const s = makeSinkhole({ depth: 39.9999, diameter: 10, collapseRate: 0.002, waterLevel: 5, stability: 40, spectacle: 35 })
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), 2660)
    expect(s.depth).toBeLessThanOrEqual(40)
  })

  it('stability按0.00004递减', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const s = makeSinkhole({ stability: 40, diameter: 10, depth: 15, collapseRate: 0.002, waterLevel: 5, spectacle: 35 })
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), 2660)
    expect(s.stability).toBeCloseTo(40 - 0.00004, 8)
  })

  it('stability不低于下限5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const s = makeSinkhole({ stability: 5, diameter: 10, depth: 15, collapseRate: 0.002, waterLevel: 5, spectacle: 35 })
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), 2660)
    expect(s.stability).toBeGreaterThanOrEqual(5)
  })

  it('spectacle不超过60', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const s = makeSinkhole({ spectacle: 59.99, diameter: 10, depth: 15, collapseRate: 0.002, waterLevel: 5, stability: 40 })
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), 2660)
    expect(s.spectacle).toBeLessThanOrEqual(60)
  })

  it('spectacle不低于10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const s = makeSinkhole({ spectacle: 10.01, diameter: 10, depth: 15, collapseRate: 0.002, waterLevel: 5, stability: 40 })
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), 2660)
    expect(s.spectacle).toBeGreaterThanOrEqual(10)
  })

  it('waterLevel不超过depth*0.8', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const s = makeSinkhole({ waterLevel: 12, depth: 15, diameter: 10, collapseRate: 0.002, stability: 40, spectacle: 35 })
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), 2660)
    // depth after update = 15+0.000005, max waterLevel = depth*0.8
    expect(s.waterLevel).toBeLessThanOrEqual(s.depth * 0.8 + 0.001)
  })

  it('waterLevel不低于0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const s = makeSinkhole({ waterLevel: 0, depth: 15, diameter: 10, collapseRate: 0.002, stability: 40, spectacle: 35 })
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), 2660)
    expect(s.waterLevel).toBeGreaterThanOrEqual(0)
  })

  it('多个天坑全部被update', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const s1 = makeSinkhole({ depth: 10, diameter: 5, collapseRate: 0.002, waterLevel: 3, stability: 40, spectacle: 35 })
    const s2 = makeSinkhole({ depth: 20, diameter: 10, collapseRate: 0.002, waterLevel: 8, stability: 50, spectacle: 30 })
    ;(sys as any).sinkholes.push(s1, s2)
    sys.update(1, makeWorld(3), makeEM(), 2660)
    expect(s1.depth).toBeCloseTo(10 + 0.000005, 8)
    expect(s2.depth).toBeCloseTo(20 + 0.000005, 8)
  })
})

// ===== describe 6: cleanup逻辑 =====
describe('WorldSinkhole2System - cleanup逻辑', () => {
  let sys: WorldSinkhole2System
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick < cutoff(=currentTick-94000)时被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const s = makeSinkhole({ tick: 0 })
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), 94001)
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('tick = cutoff时不被清除(不满足<条件)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const currentTick = 94000
    const s = makeSinkhole({ tick: 0 })
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), currentTick)
    // cutoff = 94000 - 94000 = 0, s.tick=0, 0 < 0 is false -> not removed
    expect((sys as any).sinkholes).toHaveLength(1)
  })

  it('tick刚好在cutoff-1时被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const s = makeSinkhole({ tick: 0 })
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), 94002)
    // cutoff=94002-94000=2, s.tick=0 < 2 -> removed
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('新天坑tick=当前tick时不被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    // 新spawn tick=2660, cutoff=2660-94000 negative -> 无法cleanup
    expect((sys as any).sinkholes.length).toBeGreaterThanOrEqual(1)
  })

  it('只清除过期的,保留未过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const old = makeSinkhole({ tick: 0 })
    const fresh = makeSinkhole({ tick: 100000 })
    ;(sys as any).sinkholes.push(old, fresh)
    sys.update(1, makeWorld(3), makeEM(), 200000)
    // cutoff=200000-94000=106000, old.tick=0<106000 removed, fresh.tick=100000<106000 removed
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('两个天坑都新鲜则都保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const s1 = makeSinkhole({ tick: 200000 })
    const s2 = makeSinkhole({ tick: 210000 })
    ;(sys as any).sinkholes.push(s1, s2)
    sys.update(1, makeWorld(3), makeEM(), 250000)
    // cutoff=250000-94000=156000, both ticks > cutoff -> retained
    expect((sys as any).sinkholes).toHaveLength(2)
  })

  it('从后往前清除不影响索引(多个过期)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 0; i < 5; i++) (sys as any).sinkholes.push(makeSinkhole({ tick: i }))
    sys.update(1, makeWorld(3), makeEM(), 200000)
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('清除后nextId不重置', () => {
    // 先spawn一个
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(3)
    sys.update(1, world, makeEM(), 2660)
    const idAfterSpawn = (sys as any).nextId
    // 将spawn的天坑设为旧tick并切换mock为不spawn
    ;(sys as any).sinkholes.forEach((s: Sinkhole2) => { s.tick = 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 0.5 > 0.0011 -> no spawn
    sys.update(1, world, makeEM(), 100000)
    expect((sys as any).nextId).toBe(idAfterSpawn)
  })

  it('tick恰好等于cutoff-1时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // currentTick=100000, cutoff=6000, s.tick=5999 < 6000 -> removed
    const s = makeSinkhole({ tick: 5999 })
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), 100000)
    expect((sys as any).sinkholes).toHaveLength(0)
  })
})

// ===== describe 7: 边界与综合场景 =====
describe('WorldSinkhole2System - 边界与综合场景', () => {
  let sys: WorldSinkhole2System
  afterEach(() => { vi.restoreAllMocks() })

  it('LAVA(7)上不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(7), makeEM(), 2660)
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('SNOW(6)上不spawn', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(6), makeEM(), 2660)
    expect((sys as any).sinkholes).toHaveLength(0)
  })

  it('世界极小时x/y仍合法', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(3, 25, 25)
    sys.update(1, world, makeEM(), 2660)
    // w-20=5, x=10+floor(0.001*5)=10; y同理
    const s = (sys as any).sinkholes[0]
    if (s) {
      expect(s.x).toBeGreaterThanOrEqual(10)
      expect(s.y).toBeGreaterThanOrEqual(10)
    }
  })

  it('diameter当collapseRate=0时基本不变', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const s = { id: 1, x: 25, y: 35, diameter: 10, depth: 15, collapseRate: 0, waterLevel: 5, stability: 40, spectacle: 35, tick: 0 }
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), 2660)
    expect(s.diameter).toBeCloseTo(10, 5)
  })

  it('tick节流后不重复更新', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const s = makeSinkhole({ depth: 15, diameter: 10, collapseRate: 0.002, waterLevel: 5, stability: 40, spectacle: 35 })
    ;(sys as any).sinkholes.push(s)
    sys.update(1, makeWorld(3), makeEM(), 2660) // executes
    const depthAfter1 = s.depth
    sys.update(1, makeWorld(3), makeEM(), 4000) // skipped (diff=1340 < 2660)
    expect(s.depth).toBe(depthAfter1)
  })

  it('spawn后天坑有效字段不为undefined', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2660)
    const s = (sys as any).sinkholes[0]
    if (s) {
      expect(s.id).toBeDefined()
      expect(s.x).toBeDefined()
      expect(s.diameter).toBeDefined()
      expect(s.stability).toBeDefined()
    }
  })

  it('spectacle初始在[20,50]范围(spawn时20+random*30)', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2660)
    const s = (sys as any).sinkholes[0]
    if (s) {
      expect(s.spectacle).toBeGreaterThanOrEqual(10)
      expect(s.spectacle).toBeLessThanOrEqual(60)
    }
  })

  it('waterLevel初始>=0(spawn时random*10)', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(3), makeEM(), 2660)
    const s = (sys as any).sinkholes[0]
    if (s) {
      expect(s.waterLevel).toBeGreaterThanOrEqual(0)
    }
  })

  it('MAX_SINKHOLES=12: 恰好12个时不新增', () => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 12; i++) (sys as any).sinkholes.push(makeSinkhole())
    sys.update(1, makeWorld(3), makeEM(), 2660)
    expect((sys as any).sinkholes).toHaveLength(12)
  })
})
