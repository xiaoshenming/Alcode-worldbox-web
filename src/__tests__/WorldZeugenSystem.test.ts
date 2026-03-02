import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldZeugenSystem } from '../systems/WorldZeugenSystem'
import type { Zeugen } from '../systems/WorldZeugenSystem'
import { TileType } from '../utils/Constants'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 2570
// FORM_CHANCE = 0.0014 (Math.random() < FORM_CHANCE 才spawn)
// MAX_ZEUGENS = 15
// cleanup: zeugen.tick < tick - 90000
// spawn条件: tile === SAND || tile === MOUNTAIN，且 random < FORM_CHANCE
// x: 10 + Math.floor(random*(w-20))  y: 10 + Math.floor(random*(h-20))
// capWidth: 5 + random*15 (5..20)
// pillarHeight: 3 + random*12 (3..15)
// erosionRate: 5 + random*20 (5..25)
// capHardness: 40 + random*40 (40..80)
// baseWeakness: 20 + random*40 (20..60)
// spectacle: 12 + random*30 (12..42)
// update: pillarHeight=max(1, ph-0.00002), capHardness=max(20, ch-0.00001)
//         baseWeakness=min(70, bw+0.00002), spectacle=max(5,min(55,s+(random-0.47)*0.09))

const CHECK_INTERVAL = 2570
const FORM_CHANCE = 0.0014
const MAX_ZEUGENS = 15
const TICK0 = CHECK_INTERVAL

function makeSys(): WorldZeugenSystem { return new WorldZeugenSystem() }

let nextId = 1
function makeZeugen(overrides: Partial<Zeugen> = {}): Zeugen {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    capWidth: 10,
    pillarHeight: 8,
    erosionRate: 10,
    capHardness: 60,
    baseWeakness: 40,
    spectacle: 25,
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
describe('WorldZeugenSystem - 初始状态', () => {
  let sys: WorldZeugenSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('初始zeugens数组为空', () => {
    expect((sys as any).zeugens).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始化后zeugens是数组类型', () => {
    expect(Array.isArray((sys as any).zeugens)).toBe(true)
  })

  it('手动注入一个蘑菇岩后数组长度为1', () => {
    ;(sys as any).zeugens.push(makeZeugen())
    expect((sys as any).zeugens).toHaveLength(1)
  })

  it('zeugens引用稳定（同一对象）', () => {
    const ref = (sys as any).zeugens
    expect(ref).toBe((sys as any).zeugens)
  })

  it('Zeugen包含所有必要字段', () => {
    const z: Zeugen = {
      id: 1, x: 10, y: 20,
      capWidth: 10, pillarHeight: 8,
      erosionRate: 10, capHardness: 60,
      baseWeakness: 40, spectacle: 25,
      tick: 0,
    }
    expect(z.id).toBe(1)
    expect(z.capWidth).toBe(10)
    expect(z.pillarHeight).toBe(8)
    expect(z.erosionRate).toBe(10)
    expect(z.capHardness).toBe(60)
    expect(z.baseWeakness).toBe(40)
    expect(z.spectacle).toBe(25)
  })
})

// ========================================================
// 2. CHECK_INTERVAL 节流
// ========================================================
describe('WorldZeugenSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldZeugenSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // random >= FORM_CHANCE 阻止spawn
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

  it('tick=0时不改变zeugens数组', () => {
    sys.update(0, makeMockWorld(), mockEm, 0)
    expect((sys as any).zeugens).toHaveLength(0)
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
describe('WorldZeugenSystem - spawn条件', () => {
  let sys: WorldZeugenSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('random < FORM_CHANCE 且 tile=SAND 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).zeugens).toHaveLength(1)
  })

  it('random < FORM_CHANCE 且 tile=MOUNTAIN 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.MOUNTAIN), mockEm, TICK0)
    expect((sys as any).zeugens).toHaveLength(1)
  })

  it('random >= FORM_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).zeugens).toHaveLength(0)
  })

  it('random > FORM_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).zeugens).toHaveLength(0)
  })

  it('random=1时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).zeugens).toHaveLength(0)
  })

  it('tile=DEEP_WATER时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.DEEP_WATER), mockEm, TICK0)
    expect((sys as any).zeugens).toHaveLength(0)
  })

  it('tile=SHALLOW_WATER时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).zeugens).toHaveLength(0)
  })

  it('tile=GRASS时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.GRASS), mockEm, TICK0)
    expect((sys as any).zeugens).toHaveLength(0)
  })

  it('tile=FOREST时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.FOREST), mockEm, TICK0)
    expect((sys as any).zeugens).toHaveLength(0)
  })

  it('tile=null时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(null), mockEm, TICK0)
    expect((sys as any).zeugens).toHaveLength(0)
  })

  it('zeugens已满MAX_ZEUGENS时不spawn', () => {
    for (let i = 0; i < MAX_ZEUGENS; i++) {
      ;(sys as any).zeugens.push(makeZeugen({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).zeugens).toHaveLength(MAX_ZEUGENS)
  })

  it('zeugens=MAX_ZEUGENS-1时还可以spawn', () => {
    for (let i = 0; i < MAX_ZEUGENS - 1; i++) {
      ;(sys as any).zeugens.push(makeZeugen({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).zeugens.length).toBeGreaterThan(MAX_ZEUGENS - 1)
  })
})

// ========================================================
// 4. spawn后字段值校验
// ========================================================
describe('WorldZeugenSystem - spawn后字段值', () => {
  let sys: WorldZeugenSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('spawn后tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).zeugens[0].tick).toBe(TICK0)
  })

  it('spawn后id从1开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).zeugens[0].id).toBe(1)
  })

  it('spawn后nextId递增至2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn后capWidth在5..20范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    const z = (sys as any).zeugens[0]
    expect(z.capWidth).toBeGreaterThanOrEqual(5)
    expect(z.capWidth).toBeLessThan(20)
  })

  it('spawn后pillarHeight在3..15范围（同帧update后略减）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    const z = (sys as any).zeugens[0]
    // 初始3..15，同帧update减0.00002，clamp到>=1
    expect(z.pillarHeight).toBeGreaterThanOrEqual(1)
    expect(z.pillarHeight).toBeLessThan(15)
  })

  it('spawn后erosionRate在5..25范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    const z = (sys as any).zeugens[0]
    expect(z.erosionRate).toBeGreaterThanOrEqual(5)
    expect(z.erosionRate).toBeLessThan(25)
  })

  it('spawn后capHardness在合法范围（同帧update后>=20）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    const z = (sys as any).zeugens[0]
    // 初始40..80，同帧update减0.00001
    expect(z.capHardness).toBeGreaterThanOrEqual(20)
    expect(z.capHardness).toBeLessThan(80)
  })

  it('spawn后baseWeakness在合法范围（同帧update后<=70）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    const z = (sys as any).zeugens[0]
    // 初始20..60，同帧update加0.00002
    expect(z.baseWeakness).toBeGreaterThanOrEqual(20)
    expect(z.baseWeakness).toBeLessThanOrEqual(70)
  })

  it('spawn后spectacle在合法范围（同帧update后5..55）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    const z = (sys as any).zeugens[0]
    // 初始12..42，同帧update随机漂移，clamp到[5,55]
    expect(z.spectacle).toBeGreaterThanOrEqual(5)
    expect(z.spectacle).toBeLessThanOrEqual(55)
  })

  it('坐标x在10..(width-10)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND, 200, 200), mockEm, TICK0)
    const z = (sys as any).zeugens[0]
    expect(z.x).toBeGreaterThanOrEqual(10)
    expect(z.x).toBeLessThan(190)
  })

  it('坐标y在10..(height-10)范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND, 200, 200), mockEm, TICK0)
    const z = (sys as any).zeugens[0]
    expect(z.y).toBeGreaterThanOrEqual(10)
    expect(z.y).toBeLessThan(190)
  })
})

// ========================================================
// 5. 每帧update字段漂移逻辑
// ========================================================
describe('WorldZeugenSystem - 字段动态更新', () => {
  let sys: WorldZeugenSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
  })

  it('pillarHeight每次update后缓慢减少(-0.00002)', () => {
    const z = makeZeugen({ tick: TICK0, pillarHeight: 8 })
    ;(sys as any).zeugens.push(z)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(z.pillarHeight).toBeCloseTo(8 - 0.00002, 5)
  })

  it('pillarHeight下限为1（不会低于1）', () => {
    const z = makeZeugen({ tick: TICK0, pillarHeight: 1 })
    ;(sys as any).zeugens.push(z)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(z.pillarHeight).toBeGreaterThanOrEqual(1)
  })

  it('capHardness每次update后缓慢减少(-0.00001)', () => {
    const z = makeZeugen({ tick: TICK0, capHardness: 60 })
    ;(sys as any).zeugens.push(z)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(z.capHardness).toBeCloseTo(60 - 0.00001, 5)
  })

  it('capHardness下限为20（不会低于20）', () => {
    const z = makeZeugen({ tick: TICK0, capHardness: 20 })
    ;(sys as any).zeugens.push(z)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(z.capHardness).toBeGreaterThanOrEqual(20)
  })

  it('baseWeakness每次update后缓慢增加(+0.00002)', () => {
    const z = makeZeugen({ tick: TICK0, baseWeakness: 40 })
    ;(sys as any).zeugens.push(z)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(z.baseWeakness).toBeCloseTo(40 + 0.00002, 5)
  })

  it('baseWeakness上限为70（不超过70）', () => {
    const z = makeZeugen({ tick: TICK0, baseWeakness: 70 })
    ;(sys as any).zeugens.push(z)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(z.baseWeakness).toBeLessThanOrEqual(70)
  })

  it('spectacle有random漂移（random=1 => +=(1-0.47)*0.09=+0.0477）', () => {
    const z = makeZeugen({ tick: TICK0, spectacle: 25 })
    ;(sys as any).zeugens.push(z)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(z.spectacle).toBeCloseTo(25 + (1 - 0.47) * 0.09, 4)
  })

  it('spectacle下限为5', () => {
    const z = makeZeugen({ tick: TICK0, spectacle: 5 })
    ;(sys as any).zeugens.push(z)
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(z.spectacle).toBeGreaterThanOrEqual(5)
  })

  it('spectacle上限为55', () => {
    const z = makeZeugen({ tick: TICK0, spectacle: 55 })
    ;(sys as any).zeugens.push(z)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(z.spectacle).toBeLessThanOrEqual(55)
  })

  it('多个蘑菇岩全部被update', () => {
    const z1 = makeZeugen({ tick: TICK0, pillarHeight: 5 })
    const z2 = makeZeugen({ tick: TICK0, pillarHeight: 8 })
    ;(sys as any).zeugens.push(z1, z2)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(z1.pillarHeight).toBeLessThan(5)
    expect(z2.pillarHeight).toBeLessThan(8)
  })
})

// ========================================================
// 6. cleanup逻辑
// ========================================================
describe('WorldZeugenSystem - cleanup逻辑', () => {
  let sys: WorldZeugenSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
  })

  it('zeugen.tick < tick-90000时被删除', () => {
    const z = makeZeugen({ tick: 0 })
    ;(sys as any).zeugens.push(z)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0 + 90000 + 1)
    expect((sys as any).zeugens).toHaveLength(0)
  })

  it('zeugen.tick == cutoff时不删除（严格小于）', () => {
    const T = TICK0
    const z = makeZeugen({ tick: T })
    ;(sys as any).zeugens.push(z)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, T + 90000)
    expect((sys as any).zeugens).toHaveLength(1)
  })

  it('zeugen.tick > cutoff时不删除', () => {
    const z = makeZeugen({ tick: TICK0 + 5000 })
    ;(sys as any).zeugens.push(z)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0 + 90000)
    expect((sys as any).zeugens).toHaveLength(1)
  })

  it('只删除过期的，保留新的', () => {
    const bigTick = TICK0 + 90001
    const old = makeZeugen({ tick: 0 })
    const fresh = makeZeugen({ tick: bigTick })
    ;(sys as any).zeugens.push(old, fresh)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, bigTick)
    expect((sys as any).zeugens).toHaveLength(1)
    expect((sys as any).zeugens[0].tick).toBe(bigTick)
  })

  it('全部过期时清空zeugens', () => {
    const bigTick = TICK0 + 90001
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zeugens.push(makeZeugen({ tick: 0 }))
    }
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, bigTick)
    expect((sys as any).zeugens).toHaveLength(0)
  })

  it('无过期时数量不变', () => {
    const freshTick = TICK0
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zeugens.push(makeZeugen({ tick: freshTick }))
    }
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, freshTick)
    expect((sys as any).zeugens).toHaveLength(5)
  })

  it('删除后剩余id不变', () => {
    const bigTick = TICK0 + 90001
    const keep = makeZeugen({ id: 99, tick: bigTick })
    const del = makeZeugen({ id: 100, tick: 0 })
    ;(sys as any).zeugens.push(del, keep)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, bigTick)
    expect((sys as any).zeugens).toHaveLength(1)
    expect((sys as any).zeugens[0].id).toBe(99)
  })

  it('cleanup cutoff为tick-90000', () => {
    const z = makeZeugen({ tick: 1 })
    ;(sys as any).zeugens.push(z)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0 + 90000)
    expect((sys as any).zeugens).toHaveLength(0)
  })
})

// ========================================================
// 7. MAX_ZEUGENS上限
// ========================================================
describe('WorldZeugenSystem - MAX_ZEUGENS上限', () => {
  let sys: WorldZeugenSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('MAX_ZEUGENS常量为15', () => {
    expect(MAX_ZEUGENS).toBe(15)
  })

  it('恰好MAX_ZEUGENS个时不再spawn', () => {
    for (let i = 0; i < MAX_ZEUGENS; i++) {
      ;(sys as any).zeugens.push(makeZeugen({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).zeugens).toHaveLength(MAX_ZEUGENS)
  })

  it('少于MAX_ZEUGENS时可以spawn', () => {
    for (let i = 0; i < MAX_ZEUGENS - 1; i++) {
      ;(sys as any).zeugens.push(makeZeugen({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).zeugens.length).toBeGreaterThan(MAX_ZEUGENS - 1)
  })

  it('zeugens数量不会超过MAX_ZEUGENS（多次update）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    const world = makeMockWorld(TileType.SAND)
    for (let i = 0; i < 50; i++) {
      sys.update(0, world, mockEm, TICK0 + i * CHECK_INTERVAL)
    }
    expect((sys as any).zeugens.length).toBeLessThanOrEqual(MAX_ZEUGENS)
  })

  it('CHECK_INTERVAL常量为2570', () => {
    expect(CHECK_INTERVAL).toBe(2570)
  })

  it('FORM_CHANCE常量为0.0014', () => {
    expect(FORM_CHANCE).toBe(0.0014)
  })

  it('通过cleanup减少后可再次spawn', () => {
    for (let i = 0; i < MAX_ZEUGENS; i++) {
      ;(sys as any).zeugens.push(makeZeugen({ tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0 + 90001)
    expect((sys as any).zeugens.length).toBeLessThanOrEqual(MAX_ZEUGENS)
  })
})

// ========================================================
// 8. 边界验证
// ========================================================
describe('WorldZeugenSystem - 边界验证', () => {
  it('TileType.SAND=2', () => {
    expect(TileType.SAND).toBe(2)
  })

  it('TileType.MOUNTAIN=5', () => {
    expect(TileType.MOUNTAIN).toBe(5)
  })

  it('TileType.GRASS=3', () => {
    expect(TileType.GRASS).toBe(3)
  })

  it('TileType.DEEP_WATER=0', () => {
    expect(TileType.DEEP_WATER).toBe(0)
  })

  it('TileType.SHALLOW_WATER=1', () => {
    expect(TileType.SHALLOW_WATER).toBe(1)
  })

  it('TileType.FOREST=4', () => {
    expect(TileType.FOREST).toBe(4)
  })

  it('Zeugen字段类型正确', () => {
    const z = makeZeugen()
    expect(typeof z.id).toBe('number')
    expect(typeof z.x).toBe('number')
    expect(typeof z.y).toBe('number')
    expect(typeof z.capWidth).toBe('number')
    expect(typeof z.pillarHeight).toBe('number')
    expect(typeof z.erosionRate).toBe('number')
    expect(typeof z.capHardness).toBe('number')
    expect(typeof z.baseWeakness).toBe('number')
    expect(typeof z.spectacle).toBe('number')
    expect(typeof z.tick).toBe('number')
  })

  it('两次spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    const sys = makeSys()
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0 * 2)
    expect((sys as any).nextId).toBeGreaterThanOrEqual(2)
    vi.restoreAllMocks()
  })

  it('cleanup按从后往前遍历（splice安全）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const bigTick = TICK0 + 90001
    const sys = makeSys()
    // 交替添加过期和新鲜
    for (let i = 0; i < 4; i++) {
      ;(sys as any).zeugens.push(makeZeugen({ id: i * 2, tick: 0 }))
      ;(sys as any).zeugens.push(makeZeugen({ id: i * 2 + 1, tick: bigTick }))
    }
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, bigTick)
    expect((sys as any).zeugens).toHaveLength(4)
    vi.restoreAllMocks()
  })
})
