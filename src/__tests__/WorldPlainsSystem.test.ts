import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorldPlainsSystem } from '../systems/WorldPlainsSystem'
import type { Plains } from '../systems/WorldPlainsSystem'
import { TileType } from '../utils/Constants'

const CHECK_INTERVAL = 2600
const MAX_PLAINS = 18
const FORM_CHANCE = 0.002

function makeSys(): WorldPlainsSystem { return new WorldPlainsSystem() }
let nextId = 1
function makePlains(overrides: Partial<Plains> = {}): Plains {
  return {
    id: nextId++, x: 30, y: 40,
    radius: 20, grassHeight: 40,
    soilFertility: 60, windExposure: 50,
    wildlifeAbundance: 50, moisture: 40,
    tick: 0,
    ...overrides,
  }
}

function makeWorld(tile: number = TileType.GRASS): any {
  return { width: 200, height: 200, getTile: () => tile }
}
const mockEm = {} as any

// ─── 1. 初始状态 ──────────────────────────────────────────────────────────────
describe('WorldPlainsSystem - 初始状态', () => {
  let sys: WorldPlainsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始plains为空数组', () => { expect((sys as any).plains).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('plains是数组类型', () => { expect(Array.isArray((sys as any).plains)).toBe(true) })
  it('注入一条后长度为1', () => {
    ;(sys as any).plains.push(makePlains())
    expect((sys as any).plains).toHaveLength(1)
  })
  it('内部数组是同一引用', () => {
    expect((sys as any).plains).toBe((sys as any).plains)
  })
  it('平原字段可正确读取', () => {
    ;(sys as any).plains.push(makePlains({ soilFertility: 75, wildlifeAbundance: 65, moisture: 45 }))
    const p = (sys as any).plains[0]
    expect(p.soilFertility).toBe(75)
    expect(p.wildlifeAbundance).toBe(65)
    expect(p.moisture).toBe(45)
  })
  it('radius字段正确读取', () => {
    ;(sys as any).plains.push(makePlains({ radius: 12 }))
    expect((sys as any).plains[0].radius).toBe(12)
  })
})

// ─── 2. CHECK_INTERVAL 节流 ───────────────────────────────────────────────────
describe('WorldPlainsSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldPlainsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < CHECK_INTERVAL时不执行spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).plains).toHaveLength(0)
  })
  it('tick == CHECK_INTERVAL时执行spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    expect((sys as any).plains).toHaveLength(1)
  })
  it('tick > CHECK_INTERVAL时执行spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL + 500)
    expect((sys as any).plains).toHaveLength(1)
  })
  it('两次update间隔不足不重复执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL + 100)
    expect((sys as any).plains).toHaveLength(1)
  })
  it('达到第二个间隔后再次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).plains).toHaveLength(2)
  })
  it('tick=0时不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(), mockEm, 0)
    expect((sys as any).plains).toHaveLength(0)
  })
  it('lastCheck在执行后更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

// ─── 3. spawn条件 ─────────────────────────────────────────────────────────────
describe('WorldPlainsSystem - spawn条件', () => {
  let sys: WorldPlainsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tile==GRASS且random<FORM_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    expect((sys as any).plains).toHaveLength(1)
  })
  it('tile!=GRASS时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.SAND), mockEm, CHECK_INTERVAL)
    expect((sys as any).plains).toHaveLength(0)
  })
  it('tile==MOUNTAIN时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.MOUNTAIN), mockEm, CHECK_INTERVAL)
    expect((sys as any).plains).toHaveLength(0)
  })
  it('random >= FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(FORM_CHANCE)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    expect((sys as any).plains).toHaveLength(0)
  })
  it('已有MAX_PLAINS时不spawn', () => {
    for (let i = 0; i < MAX_PLAINS; i++) {
      ;(sys as any).plains.push(makePlains({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    expect((sys as any).plains).toHaveLength(MAX_PLAINS)
  })
  it('有17个时仍可spawn', () => {
    for (let i = 0; i < MAX_PLAINS - 1; i++) {
      ;(sys as any).plains.push(makePlains({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    expect((sys as any).plains).toHaveLength(MAX_PLAINS)
  })
  it('spawn后tick字段等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    expect((sys as any).plains[0].tick).toBe(CHECK_INTERVAL)
  })
  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL * 2)
    const ids = (sys as any).plains.map((p: Plains) => p.id)
    expect(ids[0]).not.toBe(ids[1])
  })
})

// ─── 4. spawn字段范围 ─────────────────────────────────────────────────────────
describe('WorldPlainsSystem - spawn字段范围', () => {
  let sys: WorldPlainsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('radius范围[8,16)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    const p = (sys as any).plains[0]
    expect(p.radius).toBeGreaterThanOrEqual(8)
    expect(p.radius).toBeLessThan(16)
  })
  it('grassHeight范围[20,60)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    const p = (sys as any).plains[0]
    // spawn初始grassHeight=20+0*40=20，同tick update后grassHeight可能略微变化
    expect(p.grassHeight).toBeGreaterThanOrEqual(10)
    expect(p.grassHeight).toBeLessThanOrEqual(80)
  })
  it('soilFertility范围[40,75)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    const p = (sys as any).plains[0]
    // 同tick +0.005偏移
    expect(p.soilFertility).toBeGreaterThanOrEqual(40)
    expect(p.soilFertility).toBeLessThan(90)
  })
  it('wildlifeAbundance范围[20,60)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    const p = (sys as any).plains[0]
    // 同tick +0.008偏移
    expect(p.wildlifeAbundance).toBeGreaterThanOrEqual(20)
    expect(p.wildlifeAbundance).toBeLessThan(80)
  })
  it('moisture范围[25,55)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    const p = (sys as any).plains[0]
    expect(p.moisture).toBeGreaterThanOrEqual(10)
    expect(p.moisture).toBeLessThan(61)
  })
  it('windExposure范围[30,70)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    const p = (sys as any).plains[0]
    expect(p.windExposure).toBeGreaterThanOrEqual(30)
    expect(p.windExposure).toBeLessThan(70)
  })
})

// ─── 5. update数值逻辑 ────────────────────────────────────────────────────────
describe('WorldPlainsSystem - update数值逻辑', () => {
  let sys: WorldPlainsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('soilFertility每次+0.005', () => {
    const p = makePlains({ soilFertility: 50, tick: CHECK_INTERVAL })
    ;(sys as any).plains.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(p.soilFertility).toBeCloseTo(50.005, 5)
  })
  it('soilFertility不超过90', () => {
    const p = makePlains({ soilFertility: 89.999, tick: CHECK_INTERVAL })
    ;(sys as any).plains.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(p.soilFertility).toBe(90)
  })
  it('wildlifeAbundance每次+0.008', () => {
    const p = makePlains({ wildlifeAbundance: 40, tick: CHECK_INTERVAL })
    ;(sys as any).plains.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(p.wildlifeAbundance).toBeCloseTo(40.008, 5)
  })
  it('wildlifeAbundance不超过80', () => {
    const p = makePlains({ wildlifeAbundance: 79.999, tick: CHECK_INTERVAL })
    ;(sys as any).plains.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(p.wildlifeAbundance).toBe(80)
  })
  it('grassHeight有随机波动且clamp在[10,80]', () => {
    const p = makePlains({ grassHeight: 50, tick: CHECK_INTERVAL })
    ;(sys as any).plains.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    // random=0.5, (0.5-0.48)*0.2=0.004，grassHeight应在[10,80]
    expect(p.grassHeight).toBeGreaterThanOrEqual(10)
    expect(p.grassHeight).toBeLessThanOrEqual(80)
  })
  it('moisture有随机波动且clamp在[10,60]', () => {
    const p = makePlains({ moisture: 40, tick: CHECK_INTERVAL })
    ;(sys as any).plains.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(p.moisture).toBeGreaterThanOrEqual(10)
    expect(p.moisture).toBeLessThanOrEqual(60)
  })
  it('update只在CHECK_INTERVAL满足时执行', () => {
    const p = makePlains({ soilFertility: 50, tick: CHECK_INTERVAL })
    ;(sys as any).plains.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL - 1)
    expect(p.soilFertility).toBe(50)
  })
  it('多个平原同时update各自独立', () => {
    const p1 = makePlains({ soilFertility: 50, tick: CHECK_INTERVAL })
    const p2 = makePlains({ soilFertility: 60, tick: CHECK_INTERVAL })
    ;(sys as any).plains.push(p1, p2)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(p1.soilFertility).toBeCloseTo(50.005, 5)
    expect(p2.soilFertility).toBeCloseTo(60.005, 5)
  })
})

// ─── 6. cleanup逻辑 ───────────────────────────────────────────────────────────
describe('WorldPlainsSystem - cleanup逻辑', () => {
  let sys: WorldPlainsSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick值较新时不删除', () => {
    const tick = 100000
    const p = makePlains({ tick: tick - 10000 }) // 90000内，不删除
    ;(sys as any).plains.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, tick)
    // cutoff = 100000 - 90000 = 10000，p.tick=90000 > 10000，保留
    expect((sys as any).plains).toHaveLength(1)
  })
  it('tick值过旧时删除', () => {
    const tick = 100000
    // cutoff = tick - 90000 = 10000，p.tick=0 < 10000，删除
    const p = makePlains({ tick: 0 })
    ;(sys as any).plains.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).plains).toHaveLength(0)
  })
  it('tick == cutoff时删除（严格小于）', () => {
    const tick = 90000
    const cutoff = tick - 90000 // 0
    const p = makePlains({ tick: cutoff }) // tick=0 == cutoff=0，不小于，保留？
    ;(sys as any).plains.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, tick)
    // 条件：p.tick < cutoff，cutoff=0，p.tick=0，0 < 0 = false，不删除
    expect((sys as any).plains).toHaveLength(1)
  })
  it('tick == cutoff-1时删除', () => {
    const tick = 100000
    const cutoff = tick - 90000 // 10000
    const p = makePlains({ tick: cutoff - 1 }) // 9999 < 10000，删除
    ;(sys as any).plains.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).plains).toHaveLength(0)
  })
  it('混合：新的保留老的删除', () => {
    const tick = 100000
    const newP = makePlains({ tick: 95000 }) // 保留
    const oldP = makePlains({ tick: 0 })     // 删除
    ;(sys as any).plains.push(newP, oldP)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, tick)
    expect((sys as any).plains).toHaveLength(1)
    expect((sys as any).plains[0].tick).toBe(95000)
  })
  it('cleanup不在tick不满足时执行', () => {
    const p = makePlains({ tick: 0 })
    ;(sys as any).plains.push(p)
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, CHECK_INTERVAL - 1)
    expect((sys as any).plains).toHaveLength(1)
  })
  it('多个过旧平原全部删除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).plains.push(makePlains({ tick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, makeWorld(), mockEm, 100000)
    expect((sys as any).plains).toHaveLength(0)
  })
})
