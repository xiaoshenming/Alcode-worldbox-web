import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldPermafrostSystem } from '../systems/WorldPermafrostSystem'
import type { PermafrostZone } from '../systems/WorldPermafrostSystem'

function makeSys(): WorldPermafrostSystem { return new WorldPermafrostSystem() }
let nextId = 1
function makeZone(overrides: Partial<PermafrostZone> = {}): PermafrostZone {
  return {
    id: nextId++, x: 20, y: 10, radius: 8, depth: 60, thawRate: 0.02, startTick: 0,
    ...overrides,
  }
}

// CHECK_INTERVAL = 1200, SPAWN_CHANCE = 0.004, MAX_ZONES = 12
// Snow tile = 7 (不是TileType SNOW=6, 源码里直接用7)
// COLD_DAMAGE = 0.08

function makeWorld(tile: number = 7, w = 200, h = 200): any {
  return { width: w, height: h, getTile: () => tile }
}

function makeEm(entities: Array<{ x: number, y: number, health: number }>): any {
  const comps: Map<number, any> = new Map()
  const ids: number[] = []
  entities.forEach((e, i) => {
    ids.push(i)
    comps.set(i, { pos: { x: e.x, y: e.y }, needs: { health: e.health } })
  })
  return {
    getEntitiesWithComponents: () => ids,
    getComponent: (eid: number, type: string) => {
      const c = comps.get(eid)
      return type === 'position' ? c?.pos : c?.needs
    },
  }
}

describe('WorldPermafrostSystem - 初始状态', () => {
  let sys: WorldPermafrostSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始无冻土区', () => { expect((sys as any).zones).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })
  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })
  it('冻土区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.depth).toBe(60)
    expect(z.thawRate).toBe(0.02)
  })
  it('多个冻土区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })
  it('radius字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones[0].radius).toBe(8)
  })
})

describe('WorldPermafrostSystem - CHECK_INTERVAL节流', () => {
  let sys: WorldPermafrostSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行spawn逻辑', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 0)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick < CHECK_INTERVAL时不执行spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1199)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('tick == CHECK_INTERVAL时执行(lastCheck=0)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })
  it('第一次update后lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })
  it('未到间隔第二次不执行spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    const countAfterFirst = (sys as any).zones.length
    sys.update(1, world, em, 1201)
    expect((sys as any).zones.length).toBe(countAfterFirst)
  })
  it('间隔2倍tick时再次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    sys.update(1, world, em, 2400)
    expect((sys as any).lastCheck).toBe(2400)
  })
  it('节流期间applyEffects仍然执行', () => {
    // 即使在节流期间，如果有zone，applyEffects也运行
    ;(sys as any).zones.push(makeZone({ x: 5, y: 5, radius: 10, depth: 100 }))
    const em = makeEm([{ x: 5, y: 5, health: 50 }])
    const world = makeWorld(7)
    sys.update(1, world, em, 100) // < CHECK_INTERVAL
    // health should decrease due to cold damage
    const needs = em.getComponent(0, 'needs')
    expect(needs.health).toBeLessThan(50)
  })
})

describe('WorldPermafrostSystem - spawn条件', () => {
  let sys: WorldPermafrostSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('random=0 < SPAWN_CHANCE且snow地形时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('random > SPAWN_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('非snow地形且random>0.2时不spawn', () => {
    // tile!=7 且 random>0.2 -> return
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // random=0: SPAWN_CHANCE check passes(0<0.004), 然后tile check: 0!=7 && 0>0.2? No
    // actually random=0 means: 0>0.004? No, proceed; then tile check: 0!=7 && 0>0.2? 0>0.2 is false -> spawn
    // 需要用不同值来避免 tile check 被旁路
    // 使用 mockReturnValueOnce 精确控制
    const mockFn = vi.spyOn(Math, 'random')
    mockFn.mockReturnValueOnce(0)    // 第1次: SPAWN_CHANCE check: 0>0.004? No -> proceed
    mockFn.mockReturnValueOnce(0)    // 第2次: x = floor(0*200) = 0
    mockFn.mockReturnValueOnce(0)    // 第3次: y = floor(0*200) = 0
    mockFn.mockReturnValueOnce(0.5)  // 第4次: tile!=7 && 0.5>0.2 -> return (no spawn)
    const world = makeWorld(3) // GRASS tile
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    expect((sys as any).zones).toHaveLength(0)
  })
  it('非snow地形且random<=0.2时仍可spawn', () => {
    const mockFn = vi.spyOn(Math, 'random')
    mockFn.mockReturnValueOnce(0)    // SPAWN_CHANCE check pass
    mockFn.mockReturnValueOnce(0)    // x
    mockFn.mockReturnValueOnce(0)    // y
    mockFn.mockReturnValueOnce(0.1)  // tile!=7 && 0.1>0.2? No -> proceed spawn
    mockFn.mockReturnValueOnce(0)    // radius: 5 + floor(0*8) = 5
    mockFn.mockReturnValueOnce(0)    // depth: 50 + 0*50 = 50
    mockFn.mockReturnValueOnce(0)    // thawRate: 0*0.05 = 0
    const world = makeWorld(3) // non-snow
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    expect((sys as any).zones).toHaveLength(1)
  })
  it('达到MAX_ZONES(12)时不spawn', () => {
    for (let i = 0; i < 12; i++) {
      ;(sys as any).zones.push(makeZone({ depth: 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    expect((sys as any).zones).toHaveLength(12)
  })
  it('11个时还能spawn', () => {
    for (let i = 0; i < 11; i++) {
      ;(sys as any).zones.push(makeZone({ depth: 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    expect((sys as any).zones).toHaveLength(12)
  })
  it('spawn后startTick字段为当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    expect((sys as any).zones[0].startTick).toBe(1200)
  })
  it('spawn后id自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    expect((sys as any).zones[0].id).toBe(1)
  })
})

describe('WorldPermafrostSystem - spawn字段范围', () => {
  let sys: WorldPermafrostSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('radius在[5, 12]范围内(5 + floor(random*8))', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    const z = (sys as any).zones[0]
    expect(z.radius).toBeGreaterThanOrEqual(5)
    expect(z.radius).toBeLessThanOrEqual(12)
  })
  it('random=0时radius最小值为5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    expect((sys as any).zones[0].radius).toBe(5)
  })
  it('depth在[50, 100]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    const z = (sys as any).zones[0]
    // spawn后thaw: depth -= thawRate(=0), 所以 depth=50
    expect(z.depth).toBeGreaterThanOrEqual(0)
    expect(z.depth).toBeLessThanOrEqual(100)
  })
  it('random=0时depth初始值为50', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    // depth=50+0*50=50, thawRate=0*0.05=0, thaw: 50-0=50
    expect((sys as any).zones[0].depth).toBe(50)
  })
  it('thawRate在[0, 0.05]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    const z = (sys as any).zones[0]
    expect(z.thawRate).toBeGreaterThanOrEqual(0)
    expect(z.thawRate).toBeLessThanOrEqual(0.05)
  })
  it('random=0时thawRate为0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    expect((sys as any).zones[0].thawRate).toBe(0)
  })
  it('坐标在世界边界内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const world = makeWorld(7, 100, 80)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    const z = (sys as any).zones[0]
    expect(z.x).toBeGreaterThanOrEqual(0)
    expect(z.x).toBeLessThan(100)
    expect(z.y).toBeGreaterThanOrEqual(0)
    expect(z.y).toBeLessThan(80)
  })
})

describe('WorldPermafrostSystem - thaw数值逻辑', () => {
  let sys: WorldPermafrostSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次update时depth减少thawRate', () => {
    ;(sys as any).zones.push(makeZone({ depth: 60, thawRate: 0.1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    expect((sys as any).zones[0].depth).toBeCloseTo(59.9, 5)
  })
  it('depth=0时冻土区被清除', () => {
    ;(sys as any).zones.push(makeZone({ depth: 0.05, thawRate: 0.1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    // depth = 0.05 - 0.1 = -0.05 <= 0 -> removed
    expect((sys as any).zones).toHaveLength(0)
  })
  it('depth恰好为0时被清除(<=0)', () => {
    ;(sys as any).zones.push(makeZone({ depth: 0.1, thawRate: 0.1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    // depth = 0.1 - 0.1 = 0 <= 0 -> removed
    expect((sys as any).zones).toHaveLength(0)
  })
  it('thawRate=0的zone是永久性的', () => {
    ;(sys as any).zones.push(makeZone({ depth: 60, thawRate: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].depth).toBe(60)
  })
  it('多个zone同时thaw', () => {
    ;(sys as any).zones.push(makeZone({ depth: 0.5, thawRate: 2 })) // will die: 0.5-2=-1.5 <=0
    ;(sys as any).zones.push(makeZone({ depth: 60, thawRate: 0 })) // will survive
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].depth).toBe(60)
  })
  it('depth>0时zone保留', () => {
    ;(sys as any).zones.push(makeZone({ depth: 1, thawRate: 0.1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 1200)
    // depth = 1 - 0.1 = 0.9 > 0 -> kept
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].depth).toBeCloseTo(0.9, 5)
  })
  it('节流期间不执行thaw', () => {
    ;(sys as any).zones.push(makeZone({ depth: 60, thawRate: 0.1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const world = makeWorld(7)
    const em = makeEm([])
    sys.update(1, world, em, 100) // < CHECK_INTERVAL
    expect((sys as any).zones[0].depth).toBe(60) // no thaw in throttle period
  })
})

describe('WorldPermafrostSystem - applyEffects逻辑', () => {
  let sys: WorldPermafrostSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('范围内实体health下降', () => {
    ;(sys as any).zones.push(makeZone({ x: 0, y: 0, radius: 10, depth: 100 }))
    const em = makeEm([{ x: 0, y: 0, health: 50 }])
    sys.update(1, {} as any, em, 100) // throttle off, zones >0
    const needs = em.getComponent(0, 'needs')
    expect(needs.health).toBeLessThan(50)
  })
  it('范围外实体health不变', () => {
    ;(sys as any).zones.push(makeZone({ x: 0, y: 0, radius: 5, depth: 100 }))
    const em = makeEm([{ x: 100, y: 100, health: 50 }])
    sys.update(1, {} as any, em, 100)
    const needs = em.getComponent(0, 'needs')
    expect(needs.health).toBe(50)
  })
  it('health<=10时不扣血', () => {
    ;(sys as any).zones.push(makeZone({ x: 0, y: 0, radius: 10, depth: 100 }))
    const em = makeEm([{ x: 0, y: 0, health: 10 }])
    sys.update(1, {} as any, em, 100)
    const needs = em.getComponent(0, 'needs')
    expect(needs.health).toBe(10) // health not > 10, so no damage
  })
  it('health>10时扣血', () => {
    ;(sys as any).zones.push(makeZone({ x: 0, y: 0, radius: 10, depth: 100 }))
    const em = makeEm([{ x: 0, y: 0, health: 11 }])
    sys.update(1, {} as any, em, 100)
    const needs = em.getComponent(0, 'needs')
    expect(needs.health).toBeLessThan(11)
  })
  it('depth影响伤害量(depth越大伤害越大)', () => {
    ;(sys as any).zones.push(makeZone({ x: 0, y: 0, radius: 10, depth: 100 }))
    const em1 = makeEm([{ x: 0, y: 0, health: 50 }])
    sys.update(1, {} as any, em1, 100)
    const health1 = em1.getComponent(0, 'needs').health

    const sys2 = makeSys()
    ;(sys2 as any).zones.push(makeZone({ x: 0, y: 0, radius: 10, depth: 50 }))
    const em2 = makeEm([{ x: 0, y: 0, health: 50 }])
    sys2.update(1, {} as any, em2, 100)
    const health2 = em2.getComponent(0, 'needs').health

    // depth=100 causes more damage than depth=50
    expect(health1).toBeLessThan(health2)
  })
  it('伤害计算: COLD_DAMAGE * (depth * 0.01)', () => {
    // COLD_DAMAGE=0.08, depth=100 -> damage = 0.08 * 1.0 = 0.08
    ;(sys as any).zones.push(makeZone({ x: 0, y: 0, radius: 10, depth: 100 }))
    const em = makeEm([{ x: 0, y: 0, health: 50 }])
    sys.update(1, {} as any, em, 100)
    const needs = em.getComponent(0, 'needs')
    expect(needs.health).toBeCloseTo(50 - 0.08, 5)
  })
  it('无zones时不调用em', () => {
    const em = { getEntitiesWithComponents: vi.fn(() => []), getComponent: vi.fn() }
    sys.update(1, {} as any, em as any, 100)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })
  it('边界上的实体(dx*dx+dy*dy < radius*radius)受伤害', () => {
    // radius=5, entity at (4, 0): 16 < 25 -> inside
    ;(sys as any).zones.push(makeZone({ x: 0, y: 0, radius: 5, depth: 100 }))
    const em = makeEm([{ x: 4, y: 0, health: 50 }])
    sys.update(1, {} as any, em, 100)
    expect(em.getComponent(0, 'needs').health).toBeLessThan(50)
  })
  it('恰好在边界外的实体不受伤害', () => {
    // radius=5, entity at (5, 0): 25 = 25, not < 25 -> outside
    ;(sys as any).zones.push(makeZone({ x: 0, y: 0, radius: 5, depth: 100 }))
    const em = makeEm([{ x: 5, y: 0, health: 50 }])
    sys.update(1, {} as any, em, 100)
    expect(em.getComponent(0, 'needs').health).toBe(50)
  })
})
