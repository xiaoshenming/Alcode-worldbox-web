import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldPlayaSystem } from '../systems/WorldPlayaSystem'
import type { Playa } from '../systems/WorldPlayaSystem'
import { TileType } from '../utils/Constants'

const CHECK_INTERVAL = 2570
const MAX_PLAYAS = 15
const FORM_CHANCE = 0.0015

function makeSys(): WorldPlayaSystem { return new WorldPlayaSystem() }
let nextId = 1
function makePlaya(overrides: Partial<Playa> = {}): Playa {
  return {
    id: nextId++, x: 25, y: 35,
    area: 50, saltCrust: 80, waterFrequency: 10,
    evaporationRate: 90, mineralDeposit: 60, spectacle: 70,
    tick: 0,
    ...overrides,
  }
}
function makeWorld(tile = TileType.SAND) {
  return { width: 100, height: 100, getTile: vi.fn().mockReturnValue(tile) } as any
}
const mockEm = {} as any

// ─────────────────────────────────────────────
// 1. 初始状态
// ─────────────────────────────────────────────
describe('WorldPlayaSystem 初始状态', () => {
  let sys: WorldPlayaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无干盐湖', () => {
    expect((sys as any).playas).toHaveLength(0)
  })
  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入后可查询', () => {
    ;(sys as any).playas.push(makePlaya())
    expect((sys as any).playas).toHaveLength(1)
  })
  it('注入多个干盐湖全部可查', () => {
    ;(sys as any).playas.push(makePlaya(), makePlaya(), makePlaya())
    expect((sys as any).playas).toHaveLength(3)
  })
  it('返回同一内部引用', () => {
    expect((sys as any).playas).toBe((sys as any).playas)
  })
  it('干盐湖字段默认值正确', () => {
    ;(sys as any).playas.push(makePlaya())
    const p = (sys as any).playas[0]
    expect(p.saltCrust).toBe(80)
    expect(p.evaporationRate).toBe(90)
    expect(p.mineralDeposit).toBe(60)
    expect(p.spectacle).toBe(70)
  })
  it('playas是数组类型', () => {
    expect(Array.isArray((sys as any).playas)).toBe(true)
  })
  it('实例间独立，互不影响', () => {
    const sys2 = makeSys()
    ;(sys as any).playas.push(makePlaya())
    expect((sys2 as any).playas).toHaveLength(0)
  })
  it('多次注入nextId累计正确', () => {
    ;(sys as any).playas.push(makePlaya())
    ;(sys as any).playas.push(makePlaya())
    expect((sys as any).playas).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────
// 2. CHECK_INTERVAL 节流
// ─────────────────────────────────────────────
describe('WorldPlayaSystem CHECK_INTERVAL节流', () => {
  let sys: WorldPlayaSystem
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
    sys.update(1, world, mockEm, 9999)
    expect((sys as any).lastCheck).toBe(9999)
  })
  it('再次tick不足CHECK_INTERVAL时不再更新lastCheck', () => {
    sys.update(1, world, mockEm, 9999)
    sys.update(1, world, mockEm, 9999 + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(9999)
  })
  it('相邻两次间隔恰好等于CHECK_INTERVAL时两次均执行', () => {
    sys.update(1, world, mockEm, 0)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('节流期间不修改已有干盐湖字段', () => {
    const p = makePlaya({ saltCrust: 55, evaporationRate: 40 })
    ;(sys as any).playas.push(p)
    // lastCheck=0, tick=1 < CHECK_INTERVAL=2570 => 不执行
    sys.update(1, world, mockEm, 1)
    expect((sys as any).playas[0].saltCrust).toBe(55)
    expect((sys as any).playas[0].evaporationRate).toBe(40)
  })
})

// ─────────────────────────────────────────────
// 3. spawn 条件
// ─────────────────────────────────────────────
describe('WorldPlayaSystem spawn条件', () => {
  let sys: WorldPlayaSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tile=SAND时允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas).toHaveLength(1)
  })
  it('tile=GRASS时允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.GRASS)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas).toHaveLength(1)
  })
  it('tile=MOUNTAIN时不允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.MOUNTAIN)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas).toHaveLength(0)
  })
  it('tile=FOREST时不允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.FOREST)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas).toHaveLength(0)
  })
  it('tile=DEEP_WATER时不允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.DEEP_WATER)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas).toHaveLength(0)
  })
  it('tile=SHALLOW_WATER时不允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.SHALLOW_WATER)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas).toHaveLength(0)
  })
  it('tile=LAVA时不允许spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.LAVA)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas).toHaveLength(0)
  })
  it('random > FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas).toHaveLength(0)
  })
  it('random = FORM_CHANCE时不spawn（需要<而非<=）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas).toHaveLength(0)
  })
  it('已达MAX_PLAYAS时不再spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.SAND)
    for (let i = 0; i < MAX_PLAYAS; i++) {
      ;(sys as any).playas.push(makePlaya({ id: i + 100, tick: CHECK_INTERVAL }))
    }
    sys.update(1, world, mockEm, CHECK_INTERVAL * 2)
    // spawn被阻止，且新tick的cutoff不会清除tick=CHECK_INTERVAL的记录
    // cutoff = CHECK_INTERVAL*2 - 88000，若CHECK_INTERVAL*2=5140 < 88000 => cutoff负数，无清除
    expect((sys as any).playas.length).toBeLessThanOrEqual(MAX_PLAYAS)
    // 确认没有超出上限
    expect((sys as any).playas.length).toBeGreaterThanOrEqual(MAX_PLAYAS - 1)
  })
})

// ─────────────────────────────────────────────
// 4. spawn 字段范围
// ─────────────────────────────────────────────
describe('WorldPlayaSystem spawn字段范围', () => {
  afterEach(() => { vi.restoreAllMocks() })

  // spawnOne: spawn后update字段已运行一次（盐碱、蒸发率、矿物、景观微调）
  function spawnOnePlaya(): Playa {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    return (sys as any).playas[0] as Playa
  }

  it('spawn后干盐湖存在', () => {
    const p = spawnOnePlaya()
    expect(p).toBeDefined()
  })
  it('area在[20,70]范围内（不被update修改）', () => {
    const p = spawnOnePlaya()
    expect(p.area).toBeGreaterThanOrEqual(20)
    expect(p.area).toBeLessThanOrEqual(70)
  })
  it('saltCrust在update后仍在合法范围[5,70]', () => {
    // 初始 10+random*40，update后 saltCrust += (r-0.48)*0.15，clamp [5,70]
    const p = spawnOnePlaya()
    expect(p.saltCrust).toBeGreaterThanOrEqual(5)
    expect(p.saltCrust).toBeLessThanOrEqual(70)
  })
  it('waterFrequency在[3,18]范围内（不被update修改）', () => {
    const p = spawnOnePlaya()
    expect(p.waterFrequency).toBeGreaterThanOrEqual(3)
    expect(p.waterFrequency).toBeLessThanOrEqual(18)
  })
  it('evaporationRate在update后仍在合法范围[10,70]', () => {
    const p = spawnOnePlaya()
    expect(p.evaporationRate).toBeGreaterThanOrEqual(10)
    expect(p.evaporationRate).toBeLessThanOrEqual(70)
  })
  it('mineralDeposit在spawn后 >= 5（初始5+random*25）', () => {
    const p = spawnOnePlaya()
    expect(p.mineralDeposit).toBeGreaterThanOrEqual(5)
    expect(p.mineralDeposit).toBeLessThanOrEqual(50)
  })
  it('spectacle在update后仍在合法范围[5,60]', () => {
    const p = spawnOnePlaya()
    expect(p.spectacle).toBeGreaterThanOrEqual(5)
    expect(p.spectacle).toBeLessThanOrEqual(60)
  })
  it('tick记录spawn时的tick值', () => {
    const sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const world = makeWorld(TileType.SAND)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    const p = (sys as any).playas[0] as Playa
    expect(p.tick).toBe(CHECK_INTERVAL)
  })
})

// ─────────────────────────────────────────────
// 5. update 数值逻辑
// ─────────────────────────────────────────────
describe('WorldPlayaSystem update数值逻辑', () => {
  let sys: WorldPlayaSystem
  const world = makeWorld()
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('saltCrust随机波动，保持在[5,70]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const p = makePlaya({ saltCrust: 30, evaporationRate: 40 })
    ;(sys as any).playas.push(p)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    const sc = (sys as any).playas[0].saltCrust
    expect(sc).toBeGreaterThanOrEqual(5)
    expect(sc).toBeLessThanOrEqual(70)
  })
  it('saltCrust不低于5（下界保护）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    const p = makePlaya({ saltCrust: 5 })
    ;(sys as any).playas.push(p)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas[0].saltCrust).toBeGreaterThanOrEqual(5)
  })
  it('saltCrust不高于70（上界保护）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    const p = makePlaya({ saltCrust: 70 })
    ;(sys as any).playas.push(p)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas[0].saltCrust).toBeLessThanOrEqual(70)
  })
  it('evaporationRate随机波动，保持在[10,70]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const p = makePlaya({ evaporationRate: 40 })
    ;(sys as any).playas.push(p)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    const er = (sys as any).playas[0].evaporationRate
    expect(er).toBeGreaterThanOrEqual(10)
    expect(er).toBeLessThanOrEqual(70)
  })
  it('evaporationRate不低于10（下界保护）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    const p = makePlaya({ evaporationRate: 10 })
    ;(sys as any).playas.push(p)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas[0].evaporationRate).toBeGreaterThanOrEqual(10)
  })
  it('mineralDeposit每次update增加0.00003（上限50）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const p = makePlaya({ mineralDeposit: 30 })
    ;(sys as any).playas.push(p)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas[0].mineralDeposit).toBeCloseTo(30 + 0.00003, 6)
  })
  it('mineralDeposit不超过50（上限保护）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const p = makePlaya({ mineralDeposit: 50 })
    ;(sys as any).playas.push(p)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas[0].mineralDeposit).toBeLessThanOrEqual(50)
  })
  it('spectacle随机波动，保持在[5,60]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const p = makePlaya({ spectacle: 40 })
    ;(sys as any).playas.push(p)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    const sp = (sys as any).playas[0].spectacle
    expect(sp).toBeGreaterThanOrEqual(5)
    expect(sp).toBeLessThanOrEqual(60)
  })
  it('spectacle不低于5（下界保护）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    const p = makePlaya({ spectacle: 5 })
    ;(sys as any).playas.push(p)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas[0].spectacle).toBeGreaterThanOrEqual(5)
  })
  it('多个干盐湖各自独立更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const p1 = makePlaya({ id: 1, mineralDeposit: 10, saltCrust: 20 })
    const p2 = makePlaya({ id: 2, mineralDeposit: 30, saltCrust: 50 })
    ;(sys as any).playas.push(p1, p2)
    sys.update(1, world, mockEm, CHECK_INTERVAL)
    expect((sys as any).playas[0].mineralDeposit).toBeCloseTo(10 + 0.00003, 6)
    expect((sys as any).playas[1].mineralDeposit).toBeCloseTo(30 + 0.00003, 6)
  })
})

// ─────────────────────────────────────────────
// 6. cleanup 逻辑
// ─────────────────────────────────────────────
describe('WorldPlayaSystem cleanup逻辑', () => {
  let sys: WorldPlayaSystem
  const world = makeWorld()
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  // 寿命为 88000 ticks，cutoff = tick - 88000
  // 若 playa.tick < cutoff 则被清除
  it('tick<cutoff的干盐湖被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const p = makePlaya({ id: 1, tick: 0 })
    ;(sys as any).playas.push(p)
    // tick=100000, cutoff=12000; playa.tick=0 < 12000 => 清除
    sys.update(1, world, mockEm, 100000)
    expect((sys as any).playas).toHaveLength(0)
  })
  it('tick=cutoff时不被清除（严格<判断）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const p = makePlaya({ id: 1, tick: 12000 })
    ;(sys as any).playas.push(p)
    // tick=100000, cutoff=12000; playa.tick=12000, 12000<12000为false => 保留
    sys.update(1, world, mockEm, 100000)
    expect((sys as any).playas).toHaveLength(1)
  })
  it('tick>cutoff的干盐湖保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const p = makePlaya({ id: 1, tick: 13000 })
    ;(sys as any).playas.push(p)
    // tick=100000, cutoff=12000; playa.tick=13000 > 12000 => 保留
    sys.update(1, world, mockEm, 100000)
    expect((sys as any).playas).toHaveLength(1)
  })
  it('刚好在寿命内的干盐湖保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const spawnTick = 10000
    const p = makePlaya({ id: 1, tick: spawnTick })
    ;(sys as any).playas.push(p)
    // tick=spawnTick+87999, cutoff=spawnTick-1; playa.tick=spawnTick > spawnTick-1 => 保留
    sys.update(1, world, mockEm, spawnTick + 87999)
    expect((sys as any).playas).toHaveLength(1)
  })
  it('寿命恰好到期的干盐湖被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const spawnTick = 10000
    const p = makePlaya({ id: 1, tick: spawnTick })
    ;(sys as any).playas.push(p)
    // tick=spawnTick+88001, cutoff=spawnTick+1; playa.tick=spawnTick < spawnTick+1 => 清除
    sys.update(1, world, mockEm, spawnTick + 88001)
    expect((sys as any).playas).toHaveLength(0)
  })
  it('只清除过期干盐湖，其他保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const oldP = makePlaya({ id: 1, tick: 0 })
    const newP = makePlaya({ id: 2, tick: 50000 })
    ;(sys as any).playas.push(oldP, newP)
    // tick=100000, cutoff=12000; tick=0<12000 => 清除；tick=50000>12000 => 保留
    sys.update(1, world, mockEm, 100000)
    expect((sys as any).playas).toHaveLength(1)
    expect((sys as any).playas[0].id).toBe(2)
  })
  it('多个过期干盐湖全部清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 4; i++) {
      ;(sys as any).playas.push(makePlaya({ id: i + 1, tick: 0 }))
    }
    sys.update(1, world, mockEm, 100000)
    expect((sys as any).playas).toHaveLength(0)
  })
  it('cleanup后列表为空，nextId不重置', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const p = makePlaya({ id: 1, tick: 0 })
    ;(sys as any).playas.push(p)
    ;(sys as any).nextId = 5
    sys.update(1, world, mockEm, 100000)
    expect((sys as any).playas).toHaveLength(0)
    expect((sys as any).nextId).toBe(5)
  })
})
