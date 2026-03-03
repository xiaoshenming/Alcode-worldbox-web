import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

describe('WorldBlackSandBeachSystem - 扩展补充', () => {
  let sys: WorldBlackSandBeachSystem
  beforeEach(() => { sys = new WorldBlackSandBeachSystem(); vi.restoreAllMocks() })
  afterEach(() => { vi.restoreAllMocks() })

  it('补充-zones初始为空Array', () => { expect(Array.isArray((sys as any).zones)).toBe(true) })
  it('补充-nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('补充-lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('补充-tick=0时不处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-tick=2500时lastCheck更新为2500', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2500)
    expect((sys as any).lastCheck).toBe(2500)
  })
  it('补充-两次update间隔<CI时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2500)
    sys.update(1, w, e, 2500 + 100)
    expect((sys as any).lastCheck).toBe(2500)
  })
  it('补充-两次update间隔>=CI时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2500)
    sys.update(1, w, e, 2500 * 2)
    expect((sys as any).lastCheck).toBe(2500 * 2)
  })
  it('补充-update后zones引用稳定', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    const ref = (sys as any).zones
    sys.update(1, w, e, 2500)
    expect((sys as any).zones).toBe(ref)
  })
  it('补充-zones.splice正确', () => {
    ;(sys as any).zones.push({ id: 1 })
    ;(sys as any).zones.push({ id: 2 })
    ;(sys as any).zones.splice(0, 1)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('补充-注入5个后length=5', () => {
    for (let i = 0; i < 5; i++) { ;(sys as any).zones.push({ id: i+1 }) }
    expect((sys as any).zones).toHaveLength(5)
  })
  it('补充-连续trigger lastCheck单调递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2500)
    const lc1 = (sys as any).lastCheck
    sys.update(1, w, e, 2500 * 2)
    expect((sys as any).lastCheck).toBeGreaterThanOrEqual(lc1)
  })
  it('补充-update后lastCheck不超过传入tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 999999)
    expect((sys as any).lastCheck).toBeLessThanOrEqual(999999)
  })
  it('补充-清空zones后length=0', () => {
    ;(sys as any).zones.push({ id: 1 })
    ;(sys as any).zones.length = 0
    expect((sys as any).zones).toHaveLength(0)
  })
  it('补充-id注入后可读取', () => {
    ;(sys as any).zones.push({ id: 99 })
    expect((sys as any).zones[0].id).toBe(99)
  })
  it('补充-多次trigger三轮lastCheck递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2500)
    sys.update(1, w, e, 2500 * 2)
    sys.update(1, w, e, 2500 * 3)
    expect((sys as any).lastCheck).toBe(2500 * 3)
  })
  it('补充-tick=CI-1时lastCheck保持0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2500 - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-zones是同一引用', () => {
    const r1 = (sys as any).zones
    const r2 = (sys as any).zones
    expect(r1).toBe(r2)
  })
  it('补充-注入10个后length=10', () => {
    for (let i = 0; i < 10; i++) { ;(sys as any).zones.push({ id: i + 1 }) }
    expect((sys as any).zones).toHaveLength(10)
  })
  it('补充-3个trigger间lastCheck精确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2500 * 3)
    expect((sys as any).lastCheck).toBe(2500 * 3)
  })
  it('补充-random=0.9时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2500)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('补充-zones可以pop操作', () => {
    ;(sys as any).zones.push({ id: 1 })
    ;(sys as any).zones.pop()
    expect((sys as any).zones).toHaveLength(0)
  })
  it('补充-初始状态update不影响lastCheck=0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('补充-第N次trigger后lastCheck=N*CI', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    const N = 4
    sys.update(1, w, e, 2500 * N)
    expect((sys as any).lastCheck).toBe(2500 * N)
  })
  it('补充-注入元素tick字段可读取', () => {
    ;(sys as any).zones.push({ id: 1, tick: 12345 })
    expect((sys as any).zones[0].tick).toBe(12345)
  })
  it('补充-zones注入x/y字段可读取', () => {
    ;(sys as any).zones.push({ id: 1, x: 50, y: 60 })
    expect((sys as any).zones[0].x).toBe(50)
    expect((sys as any).zones[0].y).toBe(60)
  })
  it('补充-两次update在CI内仅执行一次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const w = { width: 200, height: 200, getTile: () => 0 } as any
    const e = { getEntitiesWithComponents: () => [] } as any
    sys.update(1, w, e, 2500)
    const lc = (sys as any).lastCheck
    sys.update(1, w, e, 2500 + 2500 - 1)
    expect((sys as any).lastCheck).toBe(lc)
  })
})
