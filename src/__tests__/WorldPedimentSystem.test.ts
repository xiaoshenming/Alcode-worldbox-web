import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldPedimentSystem } from '../systems/WorldPedimentSystem'
import type { Pediment } from '../systems/WorldPedimentSystem'
import { TileType } from '../utils/Constants'

// 与源码保持一致
const CHECK_INTERVAL = 2600
const FORM_CHANCE = 0.0014
const MAX_PEDIMENTS = 15

function makeSys(): WorldPedimentSystem { return new WorldPedimentSystem() }
let nextId = 1
function makePediment(overrides: Partial<Pediment> = {}): Pediment {
  return {
    id: nextId++, x: 20, y: 30,
    area: 50, slope: 5, erosionAge: 10000,
    sedimentThickness: 8, drainagePattern: 2, spectacle: 20, tick: 0,
    ...overrides,
  }
}
function makeWorld(tile: TileType = TileType.MOUNTAIN) {
  return { width: 100, height: 100, getTile: vi.fn().mockReturnValue(tile) } as any
}
const mockEm = {} as any

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPedimentSystem 初始状态', () => {
  let sys: WorldPedimentSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始pediments为空数组', () => {
    expect((sys as any).pediments).toHaveLength(0)
  })
  it('初始pediments是数组类型', () => {
    expect(Array.isArray((sys as any).pediments)).toBe(true)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入一个pediment后长度为1', () => {
    ;(sys as any).pediments.push(makePediment())
    expect((sys as any).pediments).toHaveLength(1)
  })
  it('注入多个pediment后长度正确', () => {
    ;(sys as any).pediments.push(makePediment(), makePediment(), makePediment())
    expect((sys as any).pediments).toHaveLength(3)
  })
  it('pediments返回同一引用', () => {
    expect((sys as any).pediments).toBe((sys as any).pediments)
  })
  it('手动注入的pediment字段可读', () => {
    ;(sys as any).pediments.push(makePediment({ slope: 7, sedimentThickness: 12, spectacle: 30 }))
    const p = (sys as any).pediments[0]
    expect(p.slope).toBe(7)
    expect(p.sedimentThickness).toBe(12)
    expect(p.spectacle).toBe(30)
  })
  it('drainagePattern字段可读', () => {
    ;(sys as any).pediments.push(makePediment({ drainagePattern: 3 }))
    expect((sys as any).pediments[0].drainagePattern).toBe(3)
  })
  it('tick字段初始值可为0', () => {
    ;(sys as any).pediments.push(makePediment({ tick: 0 }))
    expect((sys as any).pediments[0].tick).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPedimentSystem CHECK_INTERVAL节流', () => {
  let sys: WorldPedimentSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.9) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行（差值=0 < CHECK_INTERVAL）', () => {
    ;(sys as any).pediments.push(makePediment({ tick: 0 }))
    sys.update(0, makeWorld(), mockEm, 0)
    expect((sys as any).pediments).toHaveLength(1) // 未被cleanup执行
  })
  it('tick=CHECK_INTERVAL-1时不执行', () => {
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=CHECK_INTERVAL时执行并更新lastCheck', () => {
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick=CHECK_INTERVAL+1时执行', () => {
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1)
  })
  it('连续调用：第二次在间隔内不再执行', () => {
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    const check1 = (sys as any).lastCheck
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL + 50)
    expect((sys as any).lastCheck).toBe(check1)
  })
  it('连续调用：第二次达到间隔再次执行', () => {
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('节流期间已有pediment不被修改', () => {
    ;(sys as any).pediments.push(makePediment({ slope: 5 }))
    sys.update(0, makeWorld(), mockEm, 1) // 不足间隔
    expect((sys as any).pediments[0].slope).toBe(5)
  })
  it('执行后lastCheck被设为当前tick', () => {
    sys.update(0, makeWorld(), mockEm, 7800)
    expect((sys as any).lastCheck).toBe(7800)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPedimentSystem spawn条件', () => {
  let sys: WorldPedimentSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('随机<FORM_CHANCE且MOUNTAIN地形 → 生成pediment', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.MOUNTAIN), mockEm, CHECK_INTERVAL)
    expect((sys as any).pediments).toHaveLength(1)
  })
  it('随机<FORM_CHANCE且SAND地形 → 生成pediment', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.SAND), mockEm, CHECK_INTERVAL)
    expect((sys as any).pediments).toHaveLength(1)
  })
  it('随机<FORM_CHANCE但GRASS地形 → 不生成pediment', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    expect((sys as any).pediments).toHaveLength(0)
  })
  it('随机<FORM_CHANCE但DEEP_WATER地形 → 不生成pediment', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.DEEP_WATER), mockEm, CHECK_INTERVAL)
    expect((sys as any).pediments).toHaveLength(0)
  })
  it('随机<FORM_CHANCE但SNOW地形 → 不生成pediment', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.SNOW), mockEm, CHECK_INTERVAL)
    expect((sys as any).pediments).toHaveLength(0)
  })
  it('随机<FORM_CHANCE但FOREST地形 → 不生成pediment', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.FOREST), mockEm, CHECK_INTERVAL)
    expect((sys as any).pediments).toHaveLength(0)
  })
  it('随机>=FORM_CHANCE → 不生成pediment', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(TileType.MOUNTAIN), mockEm, CHECK_INTERVAL)
    expect((sys as any).pediments).toHaveLength(0)
  })
  it('已达MAX_PEDIMENTS时不再生成', () => {
    for (let i = 0; i < MAX_PEDIMENTS; i++) (sys as any).pediments.push(makePediment())
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.MOUNTAIN), mockEm, CHECK_INTERVAL)
    expect((sys as any).pediments).toHaveLength(MAX_PEDIMENTS)
  })
  it('生成的pediment记录当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.MOUNTAIN), mockEm, CHECK_INTERVAL)
    expect((sys as any).pediments[0].tick).toBe(CHECK_INTERVAL)
  })
  it('生成的pediment id从1开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.MOUNTAIN), mockEm, CHECK_INTERVAL)
    expect((sys as any).pediments[0].id).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPedimentSystem spawn字段范围', () => {
  let sys: WorldPedimentSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnPediment(randVal: number) {
    vi.spyOn(Math, 'random').mockReturnValue(randVal)
    sys.update(0, makeWorld(TileType.MOUNTAIN), mockEm, CHECK_INTERVAL)
    return (sys as any).pediments[0] as Pediment
  }

  it('area在[30,90]范围内', () => {
    const p = spawnPediment(0)
    expect(p.area).toBeGreaterThanOrEqual(30)
    expect(p.area).toBeLessThan(90)
  })
  it('slope在spawn+update后仍在合法范围内（>=1，<=12）', () => {
    // spawn: slope = 2 + rand*8; update同次: slope = max(1, min(12, slope - 0.00002))
    // rand=0 时 spawn=2，update后 2-0.00002=1.99998 仍>=1
    const p = spawnPediment(0)
    expect(p.slope).toBeGreaterThanOrEqual(1)
    expect(p.slope).toBeLessThanOrEqual(12)
  })
  it('erosionAge在[50,350]范围内', () => {
    const p = spawnPediment(0)
    expect(p.erosionAge).toBeGreaterThanOrEqual(50)
    expect(p.erosionAge).toBeLessThan(350)
  })
  it('sedimentThickness在[3,18]范围内', () => {
    const p = spawnPediment(0)
    expect(p.sedimentThickness).toBeGreaterThanOrEqual(3)
    expect(p.sedimentThickness).toBeLessThan(18)
  })
  it('drainagePattern在[0,3]整数范围内', () => {
    const p = spawnPediment(0)
    expect(p.drainagePattern).toBeGreaterThanOrEqual(0)
    expect(p.drainagePattern).toBeLessThanOrEqual(3)
    expect(Number.isInteger(p.drainagePattern)).toBe(true)
  })
  it('spectacle在spawn+update后仍在合法范围内（>=5，<=50）', () => {
    // spawn: spectacle = 8 + rand*25; update同次: spectacle = max(5, min(50, spectacle + (rand-0.47)*0.09))
    // rand=0 时 spawn=8，update: 8 + (0-0.47)*0.09 = 8 - 0.0423 = 7.9577，clamp下限5 → 7.9577
    const p = spawnPediment(0)
    expect(p.spectacle).toBeGreaterThanOrEqual(5)
    expect(p.spectacle).toBeLessThanOrEqual(50)
  })
  it('x坐标在边界内（>=10，<width-10）', () => {
    const p = spawnPediment(0)
    expect(p.x).toBeGreaterThanOrEqual(10)
    expect(p.x).toBeLessThan(100 - 10)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPedimentSystem update数值逻辑', () => {
  let sys: WorldPedimentSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.5) })
  afterEach(() => { vi.restoreAllMocks() })

  it('slope每次update减少0.00002', () => {
    const p = makePediment({ slope: 8 })
    ;(sys as any).pediments.push(p)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(p.slope).toBeCloseTo(8 - 0.00002, 7)
  })
  it('slope下限为1，不低于1', () => {
    const p = makePediment({ slope: 1 })
    ;(sys as any).pediments.push(p)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(p.slope).toBe(1)
  })
  it('slope上限为12，不超过', () => {
    const p = makePediment({ slope: 12 })
    ;(sys as any).pediments.push(p)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    // slope减少后仍在上限内
    expect(p.slope).toBeLessThanOrEqual(12)
  })
  it('sedimentThickness每次update增加0.00003', () => {
    const p = makePediment({ sedimentThickness: 10 })
    ;(sys as any).pediments.push(p)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(p.sedimentThickness).toBeCloseTo(10.00003, 7)
  })
  it('sedimentThickness上限为30', () => {
    const p = makePediment({ sedimentThickness: 30 })
    ;(sys as any).pediments.push(p)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(p.sedimentThickness).toBe(30)
  })
  it('area每次update增加0.00002', () => {
    const p = makePediment({ area: 60 })
    ;(sys as any).pediments.push(p)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(p.area).toBeCloseTo(60.00002, 7)
  })
  it('area上限为100', () => {
    const p = makePediment({ area: 100 })
    ;(sys as any).pediments.push(p)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(p.area).toBe(100)
  })
  it('spectacle受random影响在范围内波动（random=0.5时bias为+0.0027）', () => {
    // random=0.5 → (0.5-0.47)*0.09 = 0.03*0.09 = 0.0027
    const p = makePediment({ spectacle: 20 })
    ;(sys as any).pediments.push(p)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(p.spectacle).toBeCloseTo(20.0027, 5)
  })
  it('spectacle下限为5', () => {
    const p = makePediment({ spectacle: 5 })
    ;(sys as any).pediments.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0) // (0-0.47)*0.09 = -0.0423 → min=5
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(p.spectacle).toBe(5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPedimentSystem cleanup逻辑', () => {
  let sys: WorldPedimentSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0的pediment在tick=90001时被删除（cutoff=1，bog.tick=0<1）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).pediments.push(makePediment({ tick: 0 }))
    sys.update(0, makeWorld(), mockEm, 90001)
    expect((sys as any).pediments).toHaveLength(0)
  })
  it('tick=0的pediment在tick=90000时不被删除（cutoff=0，tick=0不小于0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).pediments.push(makePediment({ tick: 0 }))
    sys.update(0, makeWorld(), mockEm, 90000)
    expect((sys as any).pediments).toHaveLength(1)
  })
  it('旧pediment被删除，新pediment保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).pediments.push(makePediment({ tick: 0 }))
    ;(sys as any).pediments.push(makePediment({ tick: 99000 }))
    sys.update(0, makeWorld(), mockEm, 99000 + CHECK_INTERVAL)
    expect((sys as any).pediments).toHaveLength(1)
    expect((sys as any).pediments[0].tick).toBe(99000)
  })
  it('多个过期pediment全部被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).pediments.push(makePediment({ tick: 0 }))
    ;(sys as any).pediments.push(makePediment({ tick: 100 }))
    ;(sys as any).pediments.push(makePediment({ tick: 500 }))
    sys.update(0, makeWorld(), mockEm, 91000)
    expect((sys as any).pediments).toHaveLength(0)
  })
  it('无pediment时update不抛异常', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(0, makeWorld(), mockEm, 999999)).not.toThrow()
  })
  it('cutoff边界：bog.tick恰好等于cutoff时不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const pedimentTick = 2000
    ;(sys as any).pediments.push(makePediment({ tick: pedimentTick }))
    // cutoff = 92000 - 90000 = 2000，bog.tick == 2000 不小于cutoff → 不删
    sys.update(0, makeWorld(), mockEm, 92000)
    expect((sys as any).pediments).toHaveLength(1)
  })
  it('cutoff边界：bog.tick = cutoff-1时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const pedimentTick = 1999
    ;(sys as any).pediments.push(makePediment({ tick: pedimentTick }))
    // cutoff = 92000 - 90000 = 2000，bog.tick=1999 < 2000 → 删
    sys.update(0, makeWorld(), mockEm, 92000)
    expect((sys as any).pediments).toHaveLength(0)
  })
  it('cleanup后剩余pediment的area字段intact', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).pediments.push(makePediment({ tick: 0, area: 45 }))
    ;(sys as any).pediments.push(makePediment({ tick: 200000, area: 75 }))
    sys.update(0, makeWorld(), mockEm, 200000 + CHECK_INTERVAL)
    expect((sys as any).pediments).toHaveLength(1)
    expect((sys as any).pediments[0].area).toBeCloseTo(75, 1)
  })
  it('cleanup使用cutoff=tick-90000（不是95000或85000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).pediments.push(makePediment({ tick: 1000 }))
    // 若cutoff=tick-90000=91000-90000=1000，bog.tick=1000 不小于 → 保留
    sys.update(0, makeWorld(), mockEm, 91000)
    expect((sys as any).pediments).toHaveLength(1)
    // 若cutoff=91001-90000=1001，bog.tick=1000<1001 → 删
    ;(sys as any).lastCheck = 0 // 重置以允许再次执行
    sys.update(0, makeWorld(), mockEm, 91001)
    expect((sys as any).pediments).toHaveLength(0)
  })
})
