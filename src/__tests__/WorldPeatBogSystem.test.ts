import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldPeatBogSystem } from '../systems/WorldPeatBogSystem'
import type { PeatBog } from '../systems/WorldPeatBogSystem'
import { TileType } from '../utils/Constants'

// 与源码保持一致
const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.002
const MAX_BOGS = 22

function makeSys(): WorldPeatBogSystem { return new WorldPeatBogSystem() }
let nextId = 1
function makeBog(overrides: Partial<PeatBog> = {}): PeatBog {
  return {
    id: nextId++, x: 30, y: 40,
    radius: 6, peatDepth: 3, acidity: 4.5,
    waterTable: 70, sphagnumCover: 50, carbonStore: 40, tick: 0,
    ...overrides,
  }
}
function makeWorld(tile: TileType = TileType.GRASS) {
  return { width: 100, height: 100, getTile: vi.fn().mockReturnValue(tile) } as any
}
const mockEm = {} as any

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPeatBogSystem 初始状态', () => {
  let sys: WorldPeatBogSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始bogs为空数组', () => {
    expect((sys as any).bogs).toHaveLength(0)
  })
  it('初始bogs是数组类型', () => {
    expect(Array.isArray((sys as any).bogs)).toBe(true)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入一个bog后长度为1', () => {
    ;(sys as any).bogs.push(makeBog())
    expect((sys as any).bogs).toHaveLength(1)
  })
  it('注入多个bog后长度正确', () => {
    ;(sys as any).bogs.push(makeBog(), makeBog(), makeBog())
    expect((sys as any).bogs).toHaveLength(3)
  })
  it('bogs返回同一引用', () => {
    expect((sys as any).bogs).toBe((sys as any).bogs)
  })
  it('手动注入的bog字段可读', () => {
    ;(sys as any).bogs.push(makeBog({ peatDepth: 8, acidity: 5.2, waterTable: 80, sphagnumCover: 60, carbonStore: 70 }))
    const b = (sys as any).bogs[0]
    expect(b.peatDepth).toBe(8)
    expect(b.acidity).toBe(5.2)
    expect(b.waterTable).toBe(80)
  })
  it('tick字段初始值可为0', () => {
    ;(sys as any).bogs.push(makeBog({ tick: 0 }))
    expect((sys as any).bogs[0].tick).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPeatBogSystem CHECK_INTERVAL节流', () => {
  let sys: WorldPeatBogSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.9) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行（lastCheck=0，差值=0 < CHECK_INTERVAL）', () => {
    ;(sys as any).bogs.push(makeBog({ tick: 0 }))
    sys.update(0, makeWorld(), mockEm, 0)
    expect((sys as any).bogs).toHaveLength(1)
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
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(check1) // 未更新
  })
  it('连续调用：第二次达到间隔再次执行', () => {
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('节流期间不删除已有bog', () => {
    ;(sys as any).bogs.push(makeBog({ tick: 0 }))
    // tick=1，不足CHECK_INTERVAL，不执行
    sys.update(0, makeWorld(), mockEm, 1)
    expect((sys as any).bogs).toHaveLength(1)
  })
  it('执行后lastCheck被设为当前tick', () => {
    sys.update(0, makeWorld(), mockEm, 5600)
    expect((sys as any).lastCheck).toBe(5600)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPeatBogSystem spawn条件', () => {
  let sys: WorldPeatBogSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('随机<FORM_CHANCE且GRASS地形 → 生成bog', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    expect((sys as any).bogs).toHaveLength(1)
  })
  it('随机<FORM_CHANCE且SHALLOW_WATER地形 → 生成bog', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.SHALLOW_WATER), mockEm, CHECK_INTERVAL)
    expect((sys as any).bogs).toHaveLength(1)
  })
  it('随机<FORM_CHANCE但FOREST地形 → 不生成bog', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.FOREST), mockEm, CHECK_INTERVAL)
    expect((sys as any).bogs).toHaveLength(0)
  })
  it('随机<FORM_CHANCE但DEEP_WATER地形 → 不生成bog', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.DEEP_WATER), mockEm, CHECK_INTERVAL)
    expect((sys as any).bogs).toHaveLength(0)
  })
  it('随机<FORM_CHANCE但MOUNTAIN地形 → 不生成bog', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.MOUNTAIN), mockEm, CHECK_INTERVAL)
    expect((sys as any).bogs).toHaveLength(0)
  })
  it('随机<FORM_CHANCE但SAND地形 → 不生成bog', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.SAND), mockEm, CHECK_INTERVAL)
    expect((sys as any).bogs).toHaveLength(0)
  })
  it('随机>=FORM_CHANCE → 不生成bog', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    expect((sys as any).bogs).toHaveLength(0)
  })
  it('已达MAX_BOGS时不再生成', () => {
    for (let i = 0; i < MAX_BOGS; i++) (sys as any).bogs.push(makeBog())
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    expect((sys as any).bogs).toHaveLength(MAX_BOGS)
  })
  it('生成的bog记录当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    expect((sys as any).bogs[0].tick).toBe(CHECK_INTERVAL)
  })
  it('生成的bog id从1开始递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    expect((sys as any).bogs[0].id).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPeatBogSystem spawn字段范围', () => {
  let sys: WorldPeatBogSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnBog(randVal: number) {
    vi.spyOn(Math, 'random').mockReturnValue(randVal)
    sys.update(0, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    return (sys as any).bogs[0] as PeatBog
  }

  it('radius在[4,9]范围内（random=0时取最小值4）', () => {
    const b = spawnBog(0)
    expect(b.radius).toBeGreaterThanOrEqual(4)
    expect(b.radius).toBeLessThanOrEqual(9)
  })
  it('peatDepth在[1,11]范围内', () => {
    const b = spawnBog(0)
    expect(b.peatDepth).toBeGreaterThanOrEqual(1)
    expect(b.peatDepth).toBeLessThanOrEqual(11)
  })
  it('acidity在[3,6]范围内', () => {
    const b = spawnBog(0)
    expect(b.acidity).toBeGreaterThanOrEqual(3)
    expect(b.acidity).toBeLessThan(6)
  })
  it('waterTable在spawn+update后仍在[30,95]的合法范围内', () => {
    // spawn: waterTable = 60 + rand*30; update同次执行: waterTable += (rand-0.5)*0.5
    // rand=0 时 spawn=60，update=-0.25 → 59.75；clamp下限30上限95
    const b = spawnBog(0)
    expect(b.waterTable).toBeGreaterThanOrEqual(30)
    expect(b.waterTable).toBeLessThanOrEqual(95)
  })
  it('sphagnumCover在[20,60]范围内', () => {
    const b = spawnBog(0)
    expect(b.sphagnumCover).toBeGreaterThanOrEqual(20)
    expect(b.sphagnumCover).toBeLessThan(60)
  })
  it('carbonStore在[10,60]范围内', () => {
    const b = spawnBog(0)
    expect(b.carbonStore).toBeGreaterThanOrEqual(10)
    expect(b.carbonStore).toBeLessThan(60)
  })
  it('x坐标在世界边界内（>=8，<width-8）', () => {
    const b = spawnBog(0)
    expect(b.x).toBeGreaterThanOrEqual(8)
    expect(b.x).toBeLessThan(100 - 8)
  })
  it('y坐标在世界边界内（>=8，<height-8）', () => {
    const b = spawnBog(0)
    expect(b.y).toBeGreaterThanOrEqual(8)
    expect(b.y).toBeLessThan(100 - 8)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPeatBogSystem update数值逻辑', () => {
  let sys: WorldPeatBogSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.5) })
  afterEach(() => { vi.restoreAllMocks() })

  it('peatDepth每次update增加0.001', () => {
    const b = makeBog({ peatDepth: 5 })
    ;(sys as any).bogs.push(b)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(b.peatDepth).toBeCloseTo(5.001, 5)
  })
  it('peatDepth上限为30，不超过', () => {
    const b = makeBog({ peatDepth: 30 })
    ;(sys as any).bogs.push(b)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(b.peatDepth).toBe(30)
  })
  it('peatDepth接近上限时被夹到30', () => {
    const b = makeBog({ peatDepth: 29.9999 })
    ;(sys as any).bogs.push(b)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(b.peatDepth).toBe(30)
  })
  it('sphagnumCover每次update增加0.015', () => {
    const b = makeBog({ sphagnumCover: 50 })
    ;(sys as any).bogs.push(b)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(b.sphagnumCover).toBeCloseTo(50.015, 5)
  })
  it('sphagnumCover上限为95', () => {
    const b = makeBog({ sphagnumCover: 95 })
    ;(sys as any).bogs.push(b)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(b.sphagnumCover).toBe(95)
  })
  it('carbonStore每次update增加0.01', () => {
    const b = makeBog({ carbonStore: 50 })
    ;(sys as any).bogs.push(b)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(b.carbonStore).toBeCloseTo(50.01, 5)
  })
  it('carbonStore上限为100', () => {
    const b = makeBog({ carbonStore: 100 })
    ;(sys as any).bogs.push(b)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(b.carbonStore).toBe(100)
  })
  it('waterTable下限为30（Math.random()=0时-0.25，>=30保持）', () => {
    const b = makeBog({ waterTable: 30 })
    ;(sys as any).bogs.push(b)
    // random=0.5 → delta=0, waterTable不变
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(b.waterTable).toBeGreaterThanOrEqual(30)
  })
  it('waterTable上限为95', () => {
    const b = makeBog({ waterTable: 95 })
    ;(sys as any).bogs.push(b)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(b.waterTable).toBeLessThanOrEqual(95)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPeatBogSystem cleanup逻辑', () => {
  let sys: WorldPeatBogSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0的bog在tick=95001时被删除（cutoff=95001-95000=1，tick=0<1）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).bogs.push(makeBog({ tick: 0 }))
    sys.update(0, makeWorld(), mockEm, 95001)
    expect((sys as any).bogs).toHaveLength(0)
  })
  it('tick=0的bog在tick=95000时不被删除（cutoff=0，tick=0不小于0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).bogs.push(makeBog({ tick: 0 }))
    sys.update(0, makeWorld(), mockEm, 95000)
    expect((sys as any).bogs).toHaveLength(1)
  })
  it('旧bog被删除，新bog保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).bogs.push(makeBog({ tick: 0 }))
    ;(sys as any).bogs.push(makeBog({ tick: 99000 }))
    sys.update(0, makeWorld(), mockEm, 99000 + CHECK_INTERVAL)
    expect((sys as any).bogs).toHaveLength(1)
    expect((sys as any).bogs[0].tick).toBe(99000)
  })
  it('多个过期bog全部被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).bogs.push(makeBog({ tick: 0 }))
    ;(sys as any).bogs.push(makeBog({ tick: 100 }))
    ;(sys as any).bogs.push(makeBog({ tick: 200 }))
    const bigTick = 95500
    sys.update(0, makeWorld(), mockEm, bigTick)
    expect((sys as any).bogs).toHaveLength(0)
  })
  it('无bog时update不抛异常', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(0, makeWorld(), mockEm, 999999)).not.toThrow()
  })
  it('cutoff边界：tick恰好等于cutoff时不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bogTick = 1000
    ;(sys as any).bogs.push(makeBog({ tick: bogTick }))
    // cutoff = bigTick - 95000 = 96000 - 95000 = 1000，bog.tick == cutoff不小于cutoff → 不删
    const bigTick = 96000
    sys.update(0, makeWorld(), mockEm, bigTick)
    expect((sys as any).bogs).toHaveLength(1)
  })
  it('cutoff边界：bog.tick = cutoff-1时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bogTick = 999
    ;(sys as any).bogs.push(makeBog({ tick: bogTick }))
    const bigTick = 96000 // cutoff = 1000，bog.tick=999 < 1000 → 删
    sys.update(0, makeWorld(), mockEm, bigTick)
    expect((sys as any).bogs).toHaveLength(0)
  })
  it('cleanup不影响acidity字段（过期bog删后剩余bog intact）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).bogs.push(makeBog({ tick: 0, acidity: 5.5 }))
    ;(sys as any).bogs.push(makeBog({ tick: 200000, acidity: 4.2 }))
    sys.update(0, makeWorld(), mockEm, 200000 + CHECK_INTERVAL)
    expect((sys as any).bogs).toHaveLength(1)
    expect((sys as any).bogs[0].acidity).toBeCloseTo(4.2, 1)
  })
})
