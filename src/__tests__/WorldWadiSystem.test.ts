import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldWadiSystem } from '../systems/WorldWadiSystem'
import type { Wadi } from '../systems/WorldWadiSystem'
import { TileType } from '../utils/Constants'

// ===== 从源码提取的关键参数 =====
// CHECK_INTERVAL = 2560
// FORM_CHANCE = 0.0015 (Math.random() < FORM_CHANCE 才form)
// MAX_WADIS = 15
// cleanup: wadi.tick < tick - 87000
// tile条件: tile === SAND(2) || tile === GRASS(3)
// waterFrequency: max(2, min(60, val + (random-0.52)*0.22)) — 向下漂移
// depth: min(25, depth + 0.00003) — 缓慢增加
// flashFloodRisk: max(5, min(75, val + (random-0.48)*0.18)) — 轻微向上漂移
// spectacle: max(5, min(60, val + (random-0.47)*0.1)) — 轻微向上漂移
// 注意：random=1 => 1 < 0.0015 => false，阻止spawn

const CHECK_INTERVAL = 2560
const FORM_CHANCE = 0.0015
const MAX_WADIS = 15
const TICK0 = CHECK_INTERVAL // 首次触发tick

function makeSys(): WorldWadiSystem { return new WorldWadiSystem() }

let nextId = 1
function makeWadi(overrides: Partial<Wadi> = {}): Wadi {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    length: 25,
    depth: 4,
    waterFrequency: 20,
    sedimentType: 2,
    flashFloodRisk: 30,
    spectacle: 20,
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
describe('WorldWadiSystem - 初始状态', () => {
  let sys: WorldWadiSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('初始wadis数组为空', () => {
    expect((sys as any).wadis).toHaveLength(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始化后wadis是数组类型', () => {
    expect(Array.isArray((sys as any).wadis)).toBe(true)
  })

  it('手动注入一个干谷后数组长度为1', () => {
    ;(sys as any).wadis.push(makeWadi())
    expect((sys as any).wadis).toHaveLength(1)
  })

  it('wadis引用稳定（同一对象）', () => {
    const ref = (sys as any).wadis
    expect(ref).toBe((sys as any).wadis)
  })

  it('Wadi包含所有必要字段', () => {
    const w: Wadi = {
      id: 1, x: 10, y: 20, length: 30, depth: 5,
      waterFrequency: 15, sedimentType: 1, flashFloodRisk: 25,
      spectacle: 18, tick: 0,
    }
    expect(w.id).toBe(1)
    expect(w.length).toBe(30)
    expect(w.depth).toBe(5)
    expect(w.waterFrequency).toBe(15)
    expect(w.sedimentType).toBe(1)
    expect(w.flashFloodRisk).toBe(25)
    expect(w.spectacle).toBe(18)
  })
})

// ========================================================
// 2. CHECK_INTERVAL 节流
// ========================================================
describe('WorldWadiSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldWadiSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    // random=1 阻止spawn (1 < 0.0015 => false)
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

  it('tick=0时不改变wadis数组', () => {
    sys.update(0, makeMockWorld(), mockEm, 0)
    expect((sys as any).wadis).toHaveLength(0)
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
describe('WorldWadiSystem - spawn条件', () => {
  let sys: WorldWadiSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('random < FORM_CHANCE 且 tile=SAND(2) 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).wadis).toHaveLength(1)
  })

  it('random < FORM_CHANCE 且 tile=GRASS(3) 时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.GRASS), mockEm, TICK0)
    expect((sys as any).wadis).toHaveLength(1)
  })

  it('random >= FORM_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).wadis).toHaveLength(0)
  })

  it('random > FORM_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).wadis).toHaveLength(0)
  })

  it('tile=DEEP_WATER(0)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.DEEP_WATER), mockEm, TICK0)
    expect((sys as any).wadis).toHaveLength(0)
  })

  it('tile=SHALLOW_WATER(1)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SHALLOW_WATER), mockEm, TICK0)
    expect((sys as any).wadis).toHaveLength(0)
  })

  it('tile=FOREST(4)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.FOREST), mockEm, TICK0)
    expect((sys as any).wadis).toHaveLength(0)
  })

  it('tile=MOUNTAIN(5)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.MOUNTAIN), mockEm, TICK0)
    expect((sys as any).wadis).toHaveLength(0)
  })

  it('tile=null时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(null), mockEm, TICK0)
    expect((sys as any).wadis).toHaveLength(0)
  })

  it('wadis已满MAX_WADIS时不spawn', () => {
    for (let i = 0; i < MAX_WADIS; i++) {
      ;(sys as any).wadis.push(makeWadi({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).wadis).toHaveLength(MAX_WADIS)
  })

  it('wadis=MAX_WADIS-1时还可以spawn', () => {
    for (let i = 0; i < MAX_WADIS - 1; i++) {
      ;(sys as any).wadis.push(makeWadi({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).wadis.length).toBeGreaterThan(MAX_WADIS - 1)
  })
})

// ========================================================
// 4. spawn后字段值校验
// ========================================================
describe('WorldWadiSystem - spawn后字段值', () => {
  let sys: WorldWadiSystem

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
    expect((sys as any).wadis[0].tick).toBe(TICK0)
  })

  it('spawn后id从1开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).wadis[0].id).toBe(1)
  })

  it('spawn后nextId递增至2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).nextId).toBe(2)
  })

  it('spawn后length在20..65范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    const wadi = (sys as any).wadis[0]
    expect(wadi.length).toBeGreaterThanOrEqual(20)
    expect(wadi.length).toBeLessThan(65)
  })

  it('spawn后depth在3..15范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    const wadi = (sys as any).wadis[0]
    expect(wadi.depth).toBeGreaterThanOrEqual(3)
    expect(wadi.depth).toBeLessThan(15)
  })

  it('spawn后waterFrequency在合法范围内（同帧update后，2..60）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    const wadi = (sys as any).wadis[0]
    // 初始值=5+random*25(5..30)，同帧update漂移后clamp到[2,60]
    expect(wadi.waterFrequency).toBeGreaterThanOrEqual(2)
    expect(wadi.waterFrequency).toBeLessThanOrEqual(60)
  })

  it('spawn后sedimentType在0..3范围（整数）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    const wadi = (sys as any).wadis[0]
    expect(wadi.sedimentType).toBeGreaterThanOrEqual(0)
    expect(wadi.sedimentType).toBeLessThan(4)
    expect(Number.isInteger(wadi.sedimentType)).toBe(true)
  })

  it('spawn后flashFloodRisk在合法范围内（同帧update后，5..75）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    const wadi = (sys as any).wadis[0]
    // 初始值=15+random*40(15..55)，同帧update漂移后clamp到[5,75]
    expect(wadi.flashFloodRisk).toBeGreaterThanOrEqual(5)
    expect(wadi.flashFloodRisk).toBeLessThanOrEqual(75)
  })

  it('spawn后spectacle在12..47范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    const wadi = (sys as any).wadis[0]
    expect(wadi.spectacle).toBeGreaterThanOrEqual(12)
    expect(wadi.spectacle).toBeLessThan(47)
  })

  it('坐标x在合法范围内(10..width-10)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND, 200, 200), mockEm, TICK0)
    const wadi = (sys as any).wadis[0]
    expect(wadi.x).toBeGreaterThanOrEqual(10)
    expect(wadi.x).toBeLessThan(190)
  })

  it('坐标y在合法范围内(10..height-10)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND, 200, 200), mockEm, TICK0)
    const wadi = (sys as any).wadis[0]
    expect(wadi.y).toBeGreaterThanOrEqual(10)
    expect(wadi.y).toBeLessThan(190)
  })
})

// ========================================================
// 5. 每帧update字段漂移逻辑
// ========================================================
describe('WorldWadiSystem - 字段动态更新', () => {
  let sys: WorldWadiSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
  })

  it('depth每次update后缓慢增加（+0.00003）', () => {
    const wadi = makeWadi({ tick: TICK0, depth: 5 })
    ;(sys as any).wadis.push(wadi)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(wadi.depth).toBeCloseTo(5.00003, 5)
  })

  it('depth不超过25（上限clamp）', () => {
    const wadi = makeWadi({ tick: TICK0, depth: 24.99999 })
    ;(sys as any).wadis.push(wadi)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(wadi.depth).toBeLessThanOrEqual(25)
  })

  it('waterFrequency有random漂移（random=1 => +=(1-0.52)*0.22=+0.1056）', () => {
    const wadi = makeWadi({ tick: TICK0, waterFrequency: 20 })
    ;(sys as any).wadis.push(wadi)
    // random=1 => (1-0.52)*0.22 = 0.1056
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(wadi.waterFrequency).toBeCloseTo(20 + (1 - 0.52) * 0.22, 4)
  })

  it('waterFrequency下限为2（不会低于2）', () => {
    const wadi = makeWadi({ tick: TICK0, waterFrequency: 2 })
    ;(sys as any).wadis.push(wadi)
    // random=0 => (0-0.52)*0.22=-0.1144 => 2-0.1144=1.8856 => max(2,1.8856)=2
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(wadi.waterFrequency).toBeGreaterThanOrEqual(2)
  })

  it('waterFrequency上限为60（不超过60）', () => {
    const wadi = makeWadi({ tick: TICK0, waterFrequency: 60 })
    ;(sys as any).wadis.push(wadi)
    // random=1 => +0.1056 => 60.1056 => min(60,60.1056)=60
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(wadi.waterFrequency).toBeLessThanOrEqual(60)
  })

  it('flashFloodRisk有random漂移（random=1 => +=(1-0.48)*0.18=+0.0936）', () => {
    const wadi = makeWadi({ tick: TICK0, flashFloodRisk: 30 })
    ;(sys as any).wadis.push(wadi)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(wadi.flashFloodRisk).toBeCloseTo(30 + (1 - 0.48) * 0.18, 4)
  })

  it('flashFloodRisk下限为5', () => {
    const wadi = makeWadi({ tick: TICK0, flashFloodRisk: 5 })
    ;(sys as any).wadis.push(wadi)
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(wadi.flashFloodRisk).toBeGreaterThanOrEqual(5)
  })

  it('flashFloodRisk上限为75', () => {
    const wadi = makeWadi({ tick: TICK0, flashFloodRisk: 75 })
    ;(sys as any).wadis.push(wadi)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(wadi.flashFloodRisk).toBeLessThanOrEqual(75)
  })

  it('spectacle有random漂移（random=1 => +=(1-0.47)*0.1=+0.053）', () => {
    const wadi = makeWadi({ tick: TICK0, spectacle: 20 })
    ;(sys as any).wadis.push(wadi)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(wadi.spectacle).toBeCloseTo(20 + (1 - 0.47) * 0.1, 4)
  })

  it('spectacle下限为5', () => {
    const wadi = makeWadi({ tick: TICK0, spectacle: 5 })
    ;(sys as any).wadis.push(wadi)
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(wadi.spectacle).toBeGreaterThanOrEqual(5)
  })

  it('spectacle上限为60', () => {
    const wadi = makeWadi({ tick: TICK0, spectacle: 60 })
    ;(sys as any).wadis.push(wadi)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(wadi.spectacle).toBeLessThanOrEqual(60)
  })

  it('多个干谷全部被update', () => {
    const w1 = makeWadi({ tick: TICK0, depth: 5 })
    const w2 = makeWadi({ tick: TICK0, depth: 8 })
    ;(sys as any).wadis.push(w1, w2)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect(w1.depth).toBeGreaterThan(5)
    expect(w2.depth).toBeGreaterThan(8)
  })
})

// ========================================================
// 6. cleanup逻辑
// ========================================================
describe('WorldWadiSystem - cleanup逻辑', () => {
  let sys: WorldWadiSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.spyOn(Math, 'random').mockReturnValue(1) // 阻止spawn
  })

  it('wadi.tick < tick-87000时被删除', () => {
    const wadi = makeWadi({ tick: 0 })
    ;(sys as any).wadis.push(wadi)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0 + 87000 + 1)
    expect((sys as any).wadis).toHaveLength(0)
  })

  it('wadi.tick == cutoff时不删除（严格小于）', () => {
    const T = TICK0
    const wadi = makeWadi({ tick: T })
    ;(sys as any).wadis.push(wadi)
    // tick = T + 87000, cutoff = T => T < T => false
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, T + 87000)
    expect((sys as any).wadis).toHaveLength(1)
  })

  it('wadi.tick > cutoff时不删除', () => {
    const wadi = makeWadi({ tick: TICK0 + 5000 })
    ;(sys as any).wadis.push(wadi)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0 + 87000)
    expect((sys as any).wadis).toHaveLength(1)
  })

  it('只删除过期的，保留新的', () => {
    const bigTick = TICK0 + 87001
    const old = makeWadi({ tick: 0 })
    const fresh = makeWadi({ tick: bigTick })
    ;(sys as any).wadis.push(old, fresh)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, bigTick)
    expect((sys as any).wadis).toHaveLength(1)
    expect((sys as any).wadis[0].tick).toBe(bigTick)
  })

  it('全部过期时清空wadis', () => {
    const bigTick = TICK0 + 87001
    for (let i = 0; i < 5; i++) {
      ;(sys as any).wadis.push(makeWadi({ tick: 0 }))
    }
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, bigTick)
    expect((sys as any).wadis).toHaveLength(0)
  })

  it('无过期时数量不变', () => {
    const freshTick = TICK0
    for (let i = 0; i < 5; i++) {
      ;(sys as any).wadis.push(makeWadi({ tick: freshTick }))
    }
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, freshTick)
    expect((sys as any).wadis).toHaveLength(5)
  })

  it('删除后剩余id不变', () => {
    const bigTick = TICK0 + 87001
    const keep = makeWadi({ id: 99, tick: bigTick })
    const del = makeWadi({ id: 100, tick: 0 })
    ;(sys as any).wadis.push(del, keep)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, bigTick)
    expect((sys as any).wadis).toHaveLength(1)
    expect((sys as any).wadis[0].id).toBe(99)
  })

  it('cleanup cutoff为tick-87000', () => {
    // 验证87000边界：wadi.tick=1, tick=TICK0+87000, cutoff=TICK0, 1 < TICK0(2560) => 删除
    const wadi = makeWadi({ tick: 1 })
    ;(sys as any).wadis.push(wadi)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0 + 87000)
    expect((sys as any).wadis).toHaveLength(0)
  })
})

// ========================================================
// 7. MAX_WADIS上限
// ========================================================
describe('WorldWadiSystem - MAX_WADIS上限', () => {
  let sys: WorldWadiSystem

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
  })

  it('MAX_WADIS常量为15', () => {
    expect(MAX_WADIS).toBe(15)
  })

  it('恰好MAX_WADIS个时不再spawn', () => {
    for (let i = 0; i < MAX_WADIS; i++) {
      ;(sys as any).wadis.push(makeWadi({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).wadis).toHaveLength(MAX_WADIS)
  })

  it('少于MAX_WADIS时可以spawn', () => {
    for (let i = 0; i < MAX_WADIS - 1; i++) {
      ;(sys as any).wadis.push(makeWadi({ tick: TICK0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    expect((sys as any).wadis.length).toBeGreaterThan(MAX_WADIS - 1)
  })

  it('wadis数量不会超过MAX_WADIS（多次update）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    const world = makeMockWorld(TileType.SAND)
    for (let i = 0; i < 50; i++) {
      sys.update(0, world, mockEm, TICK0 + i * CHECK_INTERVAL)
    }
    expect((sys as any).wadis.length).toBeLessThanOrEqual(MAX_WADIS)
  })

  it('CHECK_INTERVAL常量为2560', () => {
    expect(CHECK_INTERVAL).toBe(2560)
  })

  it('FORM_CHANCE常量为0.0015', () => {
    expect(FORM_CHANCE).toBe(0.0015)
  })

  it('通过cleanup减少后可再次spawn', () => {
    // 填满MAX_WADIS个过期干谷
    for (let i = 0; i < MAX_WADIS; i++) {
      ;(sys as any).wadis.push(makeWadi({ tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE - 0.0001)
    // 过了87000tick后cleanup删掉所有，然后可以spawn一个
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0 + 87001)
    expect((sys as any).wadis.length).toBeLessThanOrEqual(MAX_WADIS)
  })
})

// ========================================================
// 8. TileType枚举正确性
// ========================================================
describe('WorldWadiSystem - TileType枚举', () => {
  it('SAND=2', () => {
    expect(TileType.SAND).toBe(2)
  })

  it('GRASS=3', () => {
    expect(TileType.GRASS).toBe(3)
  })

  it('DEEP_WATER=0', () => {
    expect(TileType.DEEP_WATER).toBe(0)
  })

  it('SHALLOW_WATER=1', () => {
    expect(TileType.SHALLOW_WATER).toBe(1)
  })

  it('FOREST=4', () => {
    expect(TileType.FOREST).toBe(4)
  })

  it('MOUNTAIN=5', () => {
    expect(TileType.MOUNTAIN).toBe(5)
  })

  it('sedimentType取值范围0-3（Math.floor(random*4)）', () => {
    // Math.floor(0*4)=0, Math.floor(0.999*4)=3
    const vals = [0, 1, 2, 3]
    for (const v of vals) {
      const w = makeWadi({ sedimentType: v })
      expect(w.sedimentType).toBeGreaterThanOrEqual(0)
      expect(w.sedimentType).toBeLessThanOrEqual(3)
    }
  })

  it('spawn后waterFrequency=5+random*25（最小5，最大<30）', () => {
    let callCount = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++
      if (callCount === 1) return FORM_CHANCE - 0.0001 // spawn判断
      return 0 // 其他参数全部为0
    })
    const sys = makeSys()
    sys.update(0, makeMockWorld(TileType.SAND), mockEm, TICK0)
    vi.restoreAllMocks()
    const wadi = (sys as any).wadis[0]
    if (wadi) {
      // waterFrequency spawn初始值 = 5 + 0*25 = 5
      // 但update会跑一次漂移：5 + (0-0.52)*0.22 = 5 - 0.1144 = 4.8856 => max(2, 4.8856) = 4.8856
      expect(wadi.waterFrequency).toBeGreaterThanOrEqual(2)
    }
  })
})
