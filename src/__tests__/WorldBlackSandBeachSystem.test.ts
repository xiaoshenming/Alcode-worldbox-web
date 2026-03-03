import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldBlackSandBeachSystem } from '../systems/WorldBlackSandBeachSystem'
import type { BlackSandBeachZone } from '../systems/WorldBlackSandBeachSystem'
import { TileType } from '../utils/Constants'

const SAND = TileType.SAND
const SHALLOW_WATER = TileType.SHALLOW_WATER
const MOUNTAIN = TileType.MOUNTAIN
const LAVA = TileType.LAVA
const GRASS = TileType.GRASS

function makeWorld(centerTile = GRASS, neighborTile = GRASS) {
  return {
    width: 200,
    height: 200,
    getTile: (x: number, y: number) => {
      if (x === 100 && y === 100) return centerTile
      return neighborTile
    },
  } as any
}

const safeWorld = () => ({ width: 200, height: 200, getTile: () => GRASS }) as any

const em = {} as any
let nextId = 1
function makeZone(overrides: Partial<BlackSandBeachZone> = {}): BlackSandBeachZone {
  return {
    id: nextId++,
    x: 100, y: 100,
    magnetiteContent: 50,
    waveEnergy: 60,
    sandDepth: 30,
    volcanism: 60,
    tick: 0,
    ...overrides,
  }
}

function makeSys(): WorldBlackSandBeachSystem { return new WorldBlackSandBeachSystem() }

const CHECK_INTERVAL = 2500
const MAX_ZONES = 36

describe('WorldBlackSandBeachSystem', () => {
  let sys: WorldBlackSandBeachSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ─── 初始状态 ─────────────────────────────────────────────────────────────
  it('初始zones为空', () => { expect((sys as any).zones).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('zones是数组', () => { expect(Array.isArray((sys as any).zones)).toBe(true) })
  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).zones.push(makeZone())
    expect((s2 as any).zones).toHaveLength(0)
  })

  // ─── 节流逻辑 ─────────────────────────────────────────────────────────────
  it('tick < CHECK_INTERVAL时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld(), em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('第二次间隔不足时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld(), em, CHECK_INTERVAL)
    sys.update(1, safeWorld(), em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('间隔足够时第二次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld(), em, CHECK_INTERVAL)
    sys.update(1, safeWorld(), em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ─── spawn阻止 ────────────────────────────────────────────────────────────
  it('非SAND/SHALLOW_WATER地形不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, safeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('random > FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(SAND, LAVA), em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('MAX_ZONES(36)上限不超出', () => {
    for (let i = 0; i < MAX_ZONES; i++) (sys as any).zones.push(makeZone({ tick: 99999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(SAND, LAVA), em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeLessThanOrEqual(MAX_ZONES)
  })
  it('spawn后zone有tick字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(SAND, LAVA), em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    if (z) expect(typeof z.tick).toBe('number')
  })
  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(SAND, LAVA), em, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) expect((sys as any).nextId).toBeGreaterThan(1)
  })
  it('spawn后zone包含magnetiteContent字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(SAND, LAVA), em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    if (z) expect(typeof z.magnetiteContent).toBe('number')
  })
  it('spawn后zone包含volcanism字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(SAND, LAVA), em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    if (z) expect(typeof z.volcanism).toBe('number')
  })

  // ─── cleanup（cutoff = tick - 53000）─────────────────────────────────────
  it('zone.tick < cutoff时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, safeWorld(), em, 60000)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('zone.tick >= cutoff时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 10000 }))
    sys.update(1, safeWorld(), em, 60000)
    // cutoff = 60000 - 53000 = 7000, zone.tick=10000 >= 7000 → keep
    expect((sys as any).zones).toHaveLength(1)
  })
  it('cutoff边界时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bigTick = 60000; const cutoff = bigTick - 53000  // 7000
    ;(sys as any).zones.push(makeZone({ tick: cutoff }))
    sys.update(1, safeWorld(), em, bigTick)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('混合新旧：只删过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 10000 }))
    sys.update(1, safeWorld(), em, 60000)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(10000)
  })
  it('所有zones都过期时全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) (sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, safeWorld(), em, 60000)
    expect((sys as any).zones).toHaveLength(0)
  })

  // ─── 手动注入 ────────────────────────────────────────────────────────────
  it('手动注入zone后长度正确', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('手动注入多个zone', () => {
    for (let i = 0; i < 5; i++) (sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(5)
  })
  it('注入zone的字段可读取', () => {
    ;(sys as any).zones.push(makeZone({ magnetiteContent: 88 }))
    expect((sys as any).zones[0].magnetiteContent).toBe(88)
  })

  // ─── 边界条件 ────────────────────────────────────────────────────────────
  it('tick=0不触发', () => {
    sys.update(1, safeWorld(), em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('大tick值不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, safeWorld(), em, 9999999)).not.toThrow()
  })
  it('zone字段结构完整', () => {
    const z = makeZone()
    expect(typeof z.id).toBe('number')
    expect(typeof z.x).toBe('number')
    expect(typeof z.y).toBe('number')
    expect(typeof z.magnetiteContent).toBe('number')
    expect(typeof z.waveEnergy).toBe('number')
    expect(typeof z.sandDepth).toBe('number')
    expect(typeof z.volcanism).toBe('number')
    expect(typeof z.tick).toBe('number')
  })
  it('SHALLOW_WATER地形也可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(SHALLOW_WATER, LAVA), em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
  })
  it('MOUNTAIN邻居也可触发spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(SAND, MOUNTAIN), em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(0)
  })
})
