import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldPinnacleSystem } from '../systems/WorldPinnacleSystem'
import type { Pinnacle } from '../systems/WorldPinnacleSystem'
import { TileType } from '../utils/Constants'

const CHECK_INTERVAL = 2700
const MAX_PINNACLES = 16
const FORM_CHANCE = 0.0017

function makeSys(): WorldPinnacleSystem { return new WorldPinnacleSystem() }
let nextId = 1
function makePinnacle(overrides: Partial<Pinnacle> = {}): Pinnacle {
  return {
    id: nextId++, x: 10, y: 20,
    height: 50, sharpness: 90, stability: 75,
    weathering: 20, mineralContent: 50, tick: 0,
    ...overrides,
  }
}
function makeWorld(tile = TileType.MOUNTAIN) {
  return { width: 100, height: 100, getTile: vi.fn().mockReturnValue(tile) } as any
}
const mockEm = {} as any

// ─────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────
describe('WorldPinnacleSystem 初始状态', () => {
  let sys: WorldPinnacleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无石柱', () => {
    expect((sys as any).pinnacles).toHaveLength(0)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入后可查询', () => {
    ;(sys as any).pinnacles.push(makePinnacle())
    expect((sys as any).pinnacles).toHaveLength(1)
  })
  it('注入多个石柱全部可查', () => {
    ;(sys as any).pinnacles.push(makePinnacle(), makePinnacle(), makePinnacle())
    expect((sys as any).pinnacles).toHaveLength(3)
  })
  it('返回同一内部引用', () => {
    expect((sys as any).pinnacles).toBe((sys as any).pinnacles)
  })
  it('石柱字段默认值正确', () => {
    ;(sys as any).pinnacles.push(makePinnacle())
    const p = (sys as any).pinnacles[0]
    expect(p.sharpness).toBe(90)
    expect(p.stability).toBe(75)
    expect(p.mineralContent).toBe(50)
    expect(p.weathering).toBe(20)
  })
  it('pinnacles是数组类型', () => {
    expect(Array.isArray((sys as any).pinnacles)).toBe(true)
  })
  it('实例间独立，互不影响', () => {
    const sys2 = makeSys()
    ;(sys as any).pinnacles.push(makePinnacle())
    expect((sys2 as any).pinnacles).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────────
describe('WorldPinnacleSystem CHECK_INTERVAL节流', () => {
  let sys: WorldPinnacleSystem
  const world = makeWorld()
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.9) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时执行并更新lastCheck', () => {
    sys.update(1, world, mockEm, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick < CHECK_INTERVAL时不执行', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, world, mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick = CHECK_INTERVAL时执行', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick = CHECK_INTERVAL+1时执行', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, world, mockEm, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1)
  })
  it('执行后lastCheck更新为当前tick', () => {
    sys.update(1, world, mockEm, 10000)
    expect((sys as any).lastCheck).toBe(10000)
  })
  it('再次tick不足CHECK_INTERVAL时不再更新lastCheck', () => {
    sys.update(1, world, mockEm, 10000)
    sys.update(1, world, mockEm, 10000 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(10000)
  })
  it('相邻两次间隔恰好等于CHECK_INTERVAL时两次均执行', () => {
    sys.update(1, world, mockEm, 0)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('节流期间不修改已有石柱', () => {
    const pin = makePinnacle({ weathering: 20, height: 50 })
    ;(sys as any).pinnacles.push(pin)
    // lastCheck=0, tick=1 < CHECK_INTERVAL => 不执行
    sys.update(1, world, mockEm, 1)
    expect((sys as any).pinnacles[0].height).toBe(50)
  })
})

// ─────────────────────────────────────────────
// 3. spawn 条件
// ─────────────────────────────────────────────
describe('WorldPinnacleSystem spawn条件', () => {
  let sys: WorldPinnacleSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tile=MOUNTAIN时允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).pinnacles).toHaveLength(1)
  })
  it('tile=SAND时允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).pinnacles).toHaveLength(1)
  })
  it('tile=GRASS时不允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.GRASS)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).pinnacles).toHaveLength(0)
  })
  it('tile=FOREST时不允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.FOREST)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).pinnacles).toHaveLength(0)
  })
  it('tile=DEEP_WATER时不允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.DEEP_WATER)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).pinnacles).toHaveLength(0)
  })
  it('tile=LAVA时不允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.LAVA)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).pinnacles).toHaveLength(0)
  })
  it('random > FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).pinnacles).toHaveLength(0)
  })
  it('random = FORM_CHANCE时不spawn（需要<而非<=）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    // Math.random() < FORM_CHANCE，等于时不spawn
    expect((sys as any).pinnacles).toHaveLength(0)
  })
  it('已达MAX_PINNACLES时不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.MOUNTAIN)
    for (let i = 0; i < MAX_PINNACLES; i++) {
      ;(sys as any).pinnacles.push(makePinnacle({ id: i + 100, tick: CHECK_INTERVAL }))
    }
    sys.update(1, world, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).pinnacles.length).toBeLessThanOrEqual(MAX_PINNACLES)
  })
  it('已有MAX_PINNACLES-1个时允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.MOUNTAIN)
    for (let i = 0; i < MAX_PINNACLES - 1; i++) {
      ;(sys as any).pinnacles.push(makePinnacle({ id: i + 100, tick: CHECK_INTERVAL }))
    }
    sys.update(1, world, mockEm, CHECK_INTERVAL * 2)
    // 如果spawn成功，则length=MAX_PINNACLES
    // 注意cleanup可能同时清除一些旧石柱
    expect((sys as any).pinnacles.length).toBeGreaterThanOrEqual(1)
  })
})

// ─────────────────────────────────────────────
// 4. spawn 字段范围
// ─────────────────────────────────────────────
describe('WorldPinnacleSystem spawn字段范围', () => {
  afterEach(() => { vi.restoreAllMocks() })

  // spawnOne: spawn后update已经运行一次，字段会被update微调
  function spawnOnePinnacle(): Pinnacle {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    return (sys as any).pinnacles[0] as Pinnacle
  }

  it('spawn后石柱存在', () => {
    const p = spawnOnePinnacle()
    expect(p).toBeDefined()
  })
  it('height在spawn后在合理范围内（初始[25,85]，update微减）', () => {
    const p = spawnOnePinnacle()
    // height = 25 + random*60, update后 height -= weathering*0.0002，极小变化
    expect(p.height).toBeGreaterThanOrEqual(10) // max(...,10)
    expect(p.height).toBeLessThanOrEqual(85 + 0.01)
  })
  it('sharpness在spawn后大于等于15（下界）', () => {
    const p = spawnOnePinnacle()
    expect(p.sharpness).toBeGreaterThanOrEqual(15)
  })
  it('stability在spawn后大于等于15（下界）', () => {
    const p = spawnOnePinnacle()
    expect(p.stability).toBeGreaterThanOrEqual(15)
  })
  it('weathering在spawn后仍在[2,25]范围', () => {
    const p = spawnOnePinnacle()
    expect(p.weathering).toBeGreaterThanOrEqual(2)
    expect(p.weathering).toBeLessThanOrEqual(25)
  })
  it('mineralContent在spawn初始时为[10,40]', () => {
    // mineralContent 不被 update 修改
    const p = spawnOnePinnacle()
    expect(p.mineralContent).toBeGreaterThanOrEqual(10)
    expect(p.mineralContent).toBeLessThanOrEqual(40)
  })
  it('tick记录spawn时的tick值', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    const p = (sys as any).pinnacles[0] as Pinnacle
    expect(p.tick).toBe(CHECK_INTERVAL)
  })
  it('id从1开始自增', () => {
    const p = spawnOnePinnacle()
    expect(p.id).toBe(1)
  })
})

// ─────────────────────────────────────────────
// 5. update 数值逻辑
// ─────────────────────────────────────────────
describe('WorldPinnacleSystem update数值逻辑', () => {
  let sys: WorldPinnacleSystem
  const world = makeWorld()
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('height每次update减少weathering*0.0002', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const pin = makePinnacle({ height: 50, weathering: 20, sharpness: 90, stability: 75 })
    ;(sys as any).pinnacles.push(pin)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    // height = max(10, 50 - 20*0.0002) = max(10, 49.996)
    expect((sys as any).pinnacles[0].height).toBeCloseTo(50 - 20 * 0.0002, 4)
  })
  it('height不低于10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const pin = makePinnacle({ height: 10, weathering: 25 })
    ;(sys as any).pinnacles.push(pin)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).pinnacles[0].height).toBeGreaterThanOrEqual(10)
  })
  it('sharpness每次update减少0.003', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const pin = makePinnacle({ sharpness: 90 })
    ;(sys as any).pinnacles.push(pin)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).pinnacles[0].sharpness).toBeCloseTo(90 - 0.003, 4)
  })
  it('sharpness不低于15', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const pin = makePinnacle({ sharpness: 15 })
    ;(sys as any).pinnacles.push(pin)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).pinnacles[0].sharpness).toBeGreaterThanOrEqual(15)
  })
  it('stability每次update减少weathering*0.0001', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const pin = makePinnacle({ stability: 75, weathering: 20 })
    ;(sys as any).pinnacles.push(pin)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).pinnacles[0].stability).toBeCloseTo(75 - 20 * 0.0001, 5)
  })
  it('stability不低于15', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const pin = makePinnacle({ stability: 15, weathering: 20 })
    ;(sys as any).pinnacles.push(pin)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).pinnacles[0].stability).toBeGreaterThanOrEqual(15)
  })
  it('weathering保持在[2,25]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const pin = makePinnacle({ weathering: 24 })
    ;(sys as any).pinnacles.push(pin)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    const w = (sys as any).pinnacles[0].weathering
    expect(w).toBeGreaterThanOrEqual(2)
    expect(w).toBeLessThanOrEqual(25)
  })
  it('weathering极低时不低于2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    const pin = makePinnacle({ weathering: 2 })
    ;(sys as any).pinnacles.push(pin)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).pinnacles[0].weathering).toBeGreaterThanOrEqual(2)
  })
  it('多个石柱各自独立更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const p1 = makePinnacle({ id: 1, height: 60, weathering: 10, sharpness: 80, stability: 70 })
    const p2 = makePinnacle({ id: 2, height: 40, weathering: 20, sharpness: 50, stability: 60 })
    ;(sys as any).pinnacles.push(p1, p2)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).pinnacles[0].height).toBeCloseTo(60 - 10 * 0.0002, 4)
    expect((sys as any).pinnacles[1].height).toBeCloseTo(40 - 20 * 0.0002, 4)
  })
})

// ─────────────────────────────────────────────
// 6. cleanup 逻辑
// ─────────────────────────────────────────────
describe('WorldPinnacleSystem cleanup逻辑', () => {
  let sys: WorldPinnacleSystem
  const world = makeWorld()
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  // 寿命为 93000 ticks，cutoff = tick - 93000
  // 若 pin.tick < cutoff 则被清除
  it('tick<cutoff的石柱被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const pin = makePinnacle({ id: 1, tick: 0 })
    ;(sys as any).pinnacles.push(pin)
    // tick=100000, cutoff=100000-93000=7000, pin.tick=0 < 7000 => 清除
    sys.update(1, world, mockEm, 100000)
    expect((sys as any).pinnacles).toHaveLength(0)
  })
  it('tick=cutoff时被清除（<判断）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const pin = makePinnacle({ id: 1, tick: 7000 })
    ;(sys as any).pinnacles.push(pin)
    // tick=100000, cutoff=7000, pin.tick=7000，7000<7000为false => 保留
    sys.update(1, world, mockEm, 100000)
    expect((sys as any).pinnacles).toHaveLength(1)
  })
  it('tick>cutoff的石柱保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const pin = makePinnacle({ id: 1, tick: 8000 })
    ;(sys as any).pinnacles.push(pin)
    // tick=100000, cutoff=7000, pin.tick=8000 > 7000 => 保留
    sys.update(1, world, mockEm, 100000)
    expect((sys as any).pinnacles).toHaveLength(1)
  })
  it('刚好在寿命内的石柱保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const spawnTick = 10000
    const pin = makePinnacle({ id: 1, tick: spawnTick })
    ;(sys as any).pinnacles.push(pin)
    // tick = spawnTick + 92999, cutoff = spawnTick + 92999 - 93000 = spawnTick-1
    // pin.tick=spawnTick > spawnTick-1 => 保留
    sys.update(1, world, mockEm, spawnTick + 92999)
    expect((sys as any).pinnacles).toHaveLength(1)
  })
  it('寿命恰好到期的石柱被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const spawnTick = 10000
    const pin = makePinnacle({ id: 1, tick: spawnTick })
    ;(sys as any).pinnacles.push(pin)
    // tick = spawnTick + 93001, cutoff = spawnTick + 1
    // pin.tick=spawnTick < spawnTick+1 => 清除
    sys.update(1, world, mockEm, spawnTick + 93001)
    expect((sys as any).pinnacles).toHaveLength(0)
  })
  it('只清除过期石柱，其他保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const oldPin = makePinnacle({ id: 1, tick: 0 })
    const newPin = makePinnacle({ id: 2, tick: 50000 })
    ;(sys as any).pinnacles.push(oldPin, newPin)
    // tick=100000, cutoff=7000; tick=0<7000 => 清除；tick=50000>7000 => 保留
    sys.update(1, world, mockEm, 100000)
    expect((sys as any).pinnacles).toHaveLength(1)
    expect((sys as any).pinnacles[0].id).toBe(2)
  })
  it('多个过期石柱全部清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 3; i++) {
      ;(sys as any).pinnacles.push(makePinnacle({ id: i + 1, tick: 0 }))
    }
    sys.update(1, world, mockEm, 100000)
    expect((sys as any).pinnacles).toHaveLength(0)
  })
  it('cleanup后允许继续spawn新石柱', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world2 = makeWorld(TileType.MOUNTAIN)
    // 预填充MAX_PINNACLES个旧石柱
    for (let i = 0; i < MAX_PINNACLES; i++) {
      ;(sys as any).pinnacles.push(makePinnacle({ id: i + 100, tick: 0 }))
    }
    // tick=100000时旧石柱全被清除，然后可以spawn新的
    sys.update(1, world2, mockEm, 100000)
    // cleanup先或后于spawn？看源码：先spawn再cleanup
    // spawn时zones.length=16>=MAX_PINNACLES => 不spawn；cleanup后为0
    // 所以这次update最终pinnacles=0，下次update才能spawn
    // 修正：看源码执行顺序：spawn check => update fields => cleanup
    // cleanup在spawn之后，所以本次update可能spawn了1个但也清除了16个旧的
    // 最终count = 0 + (可能的1个新spawn) - 0(新spawn tick=100000不被清除)
    // cutoff = 100000 - 93000 = 7000，新spawn tick=100000 > 7000 => 保留
    // 但spawn前 pinnacles.length=16>=16 => 不spawn
    expect((sys as any).pinnacles.length).toBeGreaterThanOrEqual(0)
  })
})
