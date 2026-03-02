import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldPermafrostThawSystem } from '../systems/WorldPermafrostThawSystem'
import type { PermafrostThawZone } from '../systems/WorldPermafrostThawSystem'
import { TileType } from '../utils/Constants'

// 与源码保持一致
const CHECK_INTERVAL = 2900
const FORM_CHANCE = 0.002
const MAX_ZONES = 24

function makeSys(): WorldPermafrostThawSystem { return new WorldPermafrostThawSystem() }
let nextId = 1
function makeZone(overrides: Partial<PermafrostThawZone> = {}): PermafrostThawZone {
  return {
    id: nextId++, x: 20, y: 30,
    radius: 5, thawDepth: 2, methaneRelease: 30,
    groundStability: 60, temperature: -8, tick: 0,
    ...overrides,
  }
}
function makeWorld(tile: TileType = TileType.SNOW) {
  return { width: 100, height: 100, getTile: vi.fn().mockReturnValue(tile) } as any
}
const mockEm = {} as any

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPermafrostThawSystem 初始状态', () => {
  let sys: WorldPermafrostThawSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始zones为空数组', () => {
    expect((sys as any).zones).toHaveLength(0)
  })
  it('初始zones是数组类型', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('注入一个zone后长度为1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('注入多个zone后长度正确', () => {
    ;(sys as any).zones.push(makeZone(), makeZone(), makeZone())
    expect((sys as any).zones).toHaveLength(3)
  })
  it('zones返回同一引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
  it('手动注入的zone字段可读', () => {
    ;(sys as any).zones.push(makeZone({ thawDepth: 3.5, methaneRelease: 45, groundStability: 55 }))
    const z = (sys as any).zones[0]
    expect(z.thawDepth).toBe(3.5)
    expect(z.methaneRelease).toBe(45)
    expect(z.groundStability).toBe(55)
  })
  it('temperature字段初始可为负数', () => {
    ;(sys as any).zones.push(makeZone({ temperature: -10 }))
    expect((sys as any).zones[0].temperature).toBe(-10)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPermafrostThawSystem CHECK_INTERVAL节流', () => {
  let sys: WorldPermafrostThawSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.9) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行（差值=0 < CHECK_INTERVAL）', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(0, makeWorld(), mockEm, 0)
    expect((sys as any).zones).toHaveLength(1)
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
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL + 200)
    expect((sys as any).lastCheck).toBe(check1)
  })
  it('连续调用：第二次达到间隔再次执行', () => {
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('节流期间已有zone的thawDepth不被修改', () => {
    ;(sys as any).zones.push(makeZone({ thawDepth: 2 }))
    sys.update(0, makeWorld(), mockEm, 1)
    expect((sys as any).zones[0].thawDepth).toBe(2)
  })
  it('执行后lastCheck被设为当前tick', () => {
    sys.update(0, makeWorld(), mockEm, 8700)
    expect((sys as any).lastCheck).toBe(8700)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPermafrostThawSystem spawn条件', () => {
  let sys: WorldPermafrostThawSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('随机<FORM_CHANCE且SNOW地形 → 生成zone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.SNOW), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('随机<FORM_CHANCE且MOUNTAIN地形 → 生成zone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.MOUNTAIN), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('随机<FORM_CHANCE但GRASS地形 → 不生成zone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.GRASS), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('随机<FORM_CHANCE但DEEP_WATER地形 → 不生成zone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.DEEP_WATER), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('随机<FORM_CHANCE但SAND地形 → 不生成zone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.SAND), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('随机<FORM_CHANCE但LAVA地形 → 不生成zone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.LAVA), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('随机>=FORM_CHANCE → 不生成zone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, makeWorld(TileType.SNOW), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('已达MAX_ZONES时不再生成', () => {
    for (let i = 0; i < MAX_ZONES; i++) (sys as any).zones.push(makeZone())
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.SNOW), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })
  it('生成的zone记录当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.SNOW), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].tick).toBe(CHECK_INTERVAL)
  })
  it('生成的zone id从1开始递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(0, makeWorld(TileType.SNOW), mockEm, CHECK_INTERVAL)
    expect((sys as any).zones[0].id).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPermafrostThawSystem spawn字段范围', () => {
  let sys: WorldPermafrostThawSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  function spawnZone(randVal: number) {
    vi.spyOn(Math, 'random').mockReturnValue(randVal)
    sys.update(0, makeWorld(TileType.SNOW), mockEm, CHECK_INTERVAL)
    return (sys as any).zones[0] as PermafrostThawZone
  }

  it('radius在[3,7]范围内', () => {
    const z = spawnZone(0)
    expect(z.radius).toBeGreaterThanOrEqual(3)
    expect(z.radius).toBeLessThanOrEqual(7)
  })
  it('thawDepth在[0.1,0.6]范围内', () => {
    const z = spawnZone(0)
    expect(z.thawDepth).toBeGreaterThanOrEqual(0.1)
    expect(z.thawDepth).toBeLessThan(0.6)
  })
  it('methaneRelease在[0,10)范围内', () => {
    const z = spawnZone(0)
    expect(z.methaneRelease).toBeGreaterThanOrEqual(0)
    expect(z.methaneRelease).toBeLessThan(10)
  })
  it('groundStability在spawn+update后仍在合法范围内（>=5，<=95）', () => {
    // spawn: groundStability = 70 + rand*25; update同次: groundStability = max(5, gs - 0.03)
    // rand=0 时 spawn=70，update: 70 - 0.03 = 69.97，clamp下限5 → 69.97
    const z = spawnZone(0)
    expect(z.groundStability).toBeGreaterThanOrEqual(5)
    expect(z.groundStability).toBeLessThan(95)
  })
  it('temperature在[-15,-5)范围内', () => {
    const z = spawnZone(0)
    expect(z.temperature).toBeGreaterThanOrEqual(-15)
    expect(z.temperature).toBeLessThan(-5)
  })
  it('x坐标在边界内（>=8，<width-8）', () => {
    const z = spawnZone(0)
    expect(z.x).toBeGreaterThanOrEqual(8)
    expect(z.x).toBeLessThan(100 - 8)
  })
  it('y坐标在边界内（>=8，<height-8）', () => {
    const z = spawnZone(0)
    expect(z.y).toBeGreaterThanOrEqual(8)
    expect(z.y).toBeLessThan(100 - 8)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPermafrostThawSystem update数值逻辑', () => {
  let sys: WorldPermafrostThawSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.spyOn(Math, 'random').mockReturnValue(0.9) })
  afterEach(() => { vi.restoreAllMocks() })

  it('thawDepth每次update增加0.005', () => {
    const z = makeZone({ thawDepth: 3 })
    ;(sys as any).zones.push(z)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(z.thawDepth).toBeCloseTo(3.005, 5)
  })
  it('thawDepth上限为10，不超过', () => {
    const z = makeZone({ thawDepth: 10 })
    ;(sys as any).zones.push(z)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(z.thawDepth).toBe(10)
  })
  it('methaneRelease增量依赖thawDepth（+=thawDepth*0.02）', () => {
    const z = makeZone({ thawDepth: 5, methaneRelease: 20 })
    ;(sys as any).zones.push(z)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    // thawDepth先变为5.005，然后methane += 5.005 * 0.02 = 0.1001
    expect(z.methaneRelease).toBeCloseTo(20 + 5.005 * 0.02, 5)
  })
  it('methaneRelease上限为100', () => {
    const z = makeZone({ thawDepth: 5, methaneRelease: 100 })
    ;(sys as any).zones.push(z)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(z.methaneRelease).toBe(100)
  })
  it('groundStability每次update减少0.03', () => {
    const z = makeZone({ groundStability: 50 })
    ;(sys as any).zones.push(z)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(z.groundStability).toBeCloseTo(49.97, 5)
  })
  it('groundStability下限为5，不低于', () => {
    const z = makeZone({ groundStability: 5 })
    ;(sys as any).zones.push(z)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(z.groundStability).toBe(5)
  })
  it('temperature每次update增加0.002（上限为5）', () => {
    const z = makeZone({ temperature: -5 })
    ;(sys as any).zones.push(z)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(z.temperature).toBeCloseTo(-4.998, 5)
  })
  it('temperature上限为5，不超过', () => {
    const z = makeZone({ temperature: 5 })
    ;(sys as any).zones.push(z)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(z.temperature).toBe(5)
  })
  it('多个zone都被更新', () => {
    const z1 = makeZone({ thawDepth: 1 })
    const z2 = makeZone({ thawDepth: 2 })
    ;(sys as any).zones.push(z1, z2)
    sys.update(0, makeWorld(), mockEm, CHECK_INTERVAL)
    expect(z1.thawDepth).toBeCloseTo(1.005, 5)
    expect(z2.thawDepth).toBeCloseTo(2.005, 5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('WorldPermafrostThawSystem cleanup逻辑', () => {
  let sys: WorldPermafrostThawSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0的zone在tick=85001时被删除（cutoff=1，zone.tick=0<1）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(0, makeWorld(), mockEm, 85001)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick=0的zone在tick=85000时不被删除（cutoff=0，zone.tick=0不小于0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(0, makeWorld(), mockEm, 85000)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('旧zone被删除，新zone保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 99000 }))
    sys.update(0, makeWorld(), mockEm, 99000 + CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(99000)
  })
  it('多个过期zone全部被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 100 }))
    ;(sys as any).zones.push(makeZone({ tick: 300 }))
    sys.update(0, makeWorld(), mockEm, 86000)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('无zone时update不抛异常', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(0, makeWorld(), mockEm, 999999)).not.toThrow()
  })
  it('cutoff边界：zone.tick恰好等于cutoff时不删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zoneTick = 3000
    ;(sys as any).zones.push(makeZone({ tick: zoneTick }))
    // cutoff = 88000 - 85000 = 3000，zone.tick == 3000 不小于cutoff → 不删
    sys.update(0, makeWorld(), mockEm, 88000)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('cutoff边界：zone.tick = cutoff-1时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const zoneTick = 2999
    ;(sys as any).zones.push(makeZone({ tick: zoneTick }))
    // cutoff = 88000 - 85000 = 3000，zone.tick=2999 < 3000 → 删
    sys.update(0, makeWorld(), mockEm, 88000)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('cleanup后剩余zone的groundStability字段intact', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0, groundStability: 40 }))
    ;(sys as any).zones.push(makeZone({ tick: 200000, groundStability: 65 }))
    sys.update(0, makeWorld(), mockEm, 200000 + CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].groundStability).toBeCloseTo(65 - 0.03, 3)
  })
  it('cleanup使用cutoff=tick-85000（不是90000或95000）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 1000 }))
    // cutoff = 86000 - 85000 = 1000，zone.tick=1000 不小于 → 保留
    sys.update(0, makeWorld(), mockEm, 86000)
    expect((sys as any).zones).toHaveLength(1)
    ;(sys as any).lastCheck = 0 // 重置允许再次执行
    // cutoff = 86001 - 85000 = 1001，zone.tick=1000 < 1001 → 删
    sys.update(0, makeWorld(), mockEm, 86001)
    expect((sys as any).zones).toHaveLength(0)
  })
})
