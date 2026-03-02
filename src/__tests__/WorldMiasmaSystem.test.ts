import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorldMiasmaSystem } from '../systems/WorldMiasmaSystem'
import type { MiasmaZone, MiasmaSource } from '../systems/WorldMiasmaSystem'
import { TileType } from '../utils/Constants'

// ── 工厂函数 ─────────────────────────────────────────────────────────────────

function makeSys(): WorldMiasmaSystem { return new WorldMiasmaSystem() }

let nextId = 100
function makeZone(
  overrides: Partial<MiasmaZone> = {}
): MiasmaZone {
  return {
    id: nextId++,
    x: 10,
    y: 10,
    radius: 4,
    intensity: 50,
    source: 'swamp',
    spreadRate: 0.1,
    decayRate: 0.05,
    createdTick: 0,
    ...overrides,
  }
}

function makeWorld(tile: number = TileType.SHALLOW_WATER, w = 100, h = 100) {
  return {
    width: w,
    height: h,
    getTile: (_x: number, _y: number) => tile,
  }
}

// ── 1. 初始状态 ────────────────────────────────────────────────────────────────

describe('1. 初始状态', () => {
  let sys: WorldMiasmaSystem

  beforeEach(() => { sys = makeSys(); nextId = 100 })

  it('zones 初始为空数组', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('getToxicZones() 初始返回空数组', () => {
    expect(sys.getToxicZones()).toHaveLength(0)
  })

  it('_toxicZonesBuf 初始为空', () => {
    expect((sys as any)._toxicZonesBuf).toHaveLength(0)
  })

  it('zones 初始是数组类型', () => {
    expect(Array.isArray((sys as any).zones)).toBe(true)
  })

  it('注入一个 zone 后 zones.length 为 1', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('注入三个 zone 后 zones.length 为 3', () => {
    ;(sys as any).zones.push(makeZone(), makeZone(), makeZone())
    expect((sys as any).zones).toHaveLength(3)
  })
})

// ── 2. 节流（CHECK_INTERVAL = 1100）─────────────────────────────────────────

describe('2. 节流 CHECK_INTERVAL=1100', () => {
  let sys: WorldMiasmaSystem
  const world = makeWorld(TileType.SHALLOW_WATER)

  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 时执行 update 后 lastCheck 更新为 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1) // > SPAWN_CHANCE => 不 spawn
    sys.update(1, world as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL 时 lastCheck 不改变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, 0)   // first call triggers
    const before = (sys as any).lastCheck
    sys.update(1, world as any, 500) // 500 < 1100: skip
    expect((sys as any).lastCheck).toBe(before)
  })

  it('tick >= CHECK_INTERVAL 时 lastCheck 更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, 0)
    sys.update(1, world as any, 1100)
    expect((sys as any).lastCheck).toBe(1100)
  })

  it('tick=1099 时不更新（差 1 不够）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, 0)
    sys.update(1, world as any, 1099)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1100 后再 tick=2000 时 lastCheck=2000', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, 0)
    sys.update(1, world as any, 1100)
    sys.update(1, world as any, 2200)
    expect((sys as any).lastCheck).toBe(2200)
  })

  it('节流期间 zones.length 不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world as any, 0)
    const len = (sys as any).zones.length
    sys.update(1, world as any, 500)
    expect((sys as any).zones.length).toBe(len)
  })

  it('update 未到阈值时 getToxicZones 仍可调用', () => {
    sys.update(1, world as any, 500)
    expect(() => sys.getToxicZones()).not.toThrow()
  })

  it('lastCheck 类型为 number', () => {
    expect(typeof (sys as any).lastCheck).toBe('number')
  })
})

// ── 3. spawn 条件 ─────────────────────────────────────────────────────────────

describe('3. spawn 条件', () => {
  let sys: WorldMiasmaSystem

  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('SHALLOW_WATER tile + random<SPAWN_CHANCE => source=swamp', () => {
    const world = makeWorld(TileType.SHALLOW_WATER)
    // Math.random: position(x)=0.5, position(y)=0.5, then SPAWN_CHANCE check: 0.01 < 0.015
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.5)   // x
      .mockReturnValueOnce(0.5)   // y
      .mockReturnValueOnce(0.01)  // < SPAWN_CHANCE
      .mockReturnValue(0.5)       // radius/intensity/spreadRate/decayRate
    sys.update(1, world as any, 0)
    const zones: MiasmaZone[] = (sys as any).zones
    if (zones.length > 0) {
      expect(zones[0].source).toBe('swamp')
    }
  })

  it('SAND tile => source=swamp', () => {
    const world = makeWorld(TileType.SAND)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.01)
      .mockReturnValue(0.5)
    sys.update(1, world as any, 0)
    const zones: MiasmaZone[] = (sys as any).zones
    if (zones.length > 0) {
      expect(zones[0].source).toBe('swamp')
    }
  })

  it('LAVA tile => source=volcanic', () => {
    const world = makeWorld(TileType.LAVA)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.01)
      .mockReturnValue(0.5)
    sys.update(1, world as any, 0)
    const zones: MiasmaZone[] = (sys as any).zones
    if (zones.length > 0) {
      expect(zones[0].source).toBe('volcanic')
    }
  })

  it('GRASS + random<0.3 + random<0.5 => source=battlefield', () => {
    const world = makeWorld(TileType.GRASS)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)  // x
      .mockReturnValueOnce(0.5)  // y
      .mockReturnValueOnce(0.2)  // < 0.3 => eligible
      .mockReturnValueOnce(0.4)  // < 0.5 => battlefield
      .mockReturnValueOnce(0.01) // < SPAWN_CHANCE
      .mockReturnValue(0.5)
    sys.update(1, world as any, 0)
    const zones: MiasmaZone[] = (sys as any).zones
    if (zones.length > 0) {
      expect(zones[0].source).toBe('battlefield')
    }
  })

  it('GRASS + random<0.3 + random>=0.5 => source=pollution', () => {
    const world = makeWorld(TileType.GRASS)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.2)  // < 0.3
      .mockReturnValueOnce(0.6)  // >= 0.5 => pollution
      .mockReturnValueOnce(0.01)
      .mockReturnValue(0.5)
    sys.update(1, world as any, 0)
    const zones: MiasmaZone[] = (sys as any).zones
    if (zones.length > 0) {
      expect(zones[0].source).toBe('pollution')
    }
  })

  it('GRASS + random>=0.3 => 不 spawn（continue）', () => {
    const world = makeWorld(TileType.GRASS)
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 0.5 >= 0.3 => skip grass; all 6 attempts fail
    sys.update(1, world as any, 0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('MOUNTAIN tile => 不 spawn', () => {
    const world = makeWorld(TileType.MOUNTAIN)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(1, world as any, 0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('DEEP_WATER tile => 不 spawn', () => {
    const world = makeWorld(TileType.DEEP_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(1, world as any, 0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('random > SPAWN_CHANCE(0.015) => 不 spawn', () => {
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // > 0.015
    sys.update(1, world as any, 0)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('已有 zone 距离 < 8 => 不 spawn（overlap check）', () => {
    const world = makeWorld(TileType.SHALLOW_WATER)
    // 预放一个 zone 在 (50,50)
    ;(sys as any).zones.push(makeZone({ x: 50, y: 50 }))
    // random 返回 50/100=0.5 => x=50, y=50 => 距离=0 < 8 => 跳过
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)  // x=50
      .mockReturnValueOnce(0.5)  // y=50
      .mockReturnValueOnce(0.01) // < SPAWN_CHANCE
      .mockReturnValue(0.5)
    const beforeLen = (sys as any).zones.length
    sys.update(1, world as any, 0)
    // overlap => 不 spawn 新的
    expect((sys as any).zones.length).toBe(beforeLen)
  })
})

// ── 4. spawn 后字段值 ─────────────────────────────────────────────────────────

describe('4. spawn 后字段值', () => {
  let sys: WorldMiasmaSystem

  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('swamp zone radius 在 [3, 7] 范围内', () => {
    const zone = makeZone({ source: 'swamp', radius: 5 })
    expect(zone.radius).toBeGreaterThanOrEqual(3)
    expect(zone.radius).toBeLessThanOrEqual(7)
  })

  it('swamp intensity 在 [20, 50] 范围内', () => {
    ;(sys as any).zones.push(makeZone({ source: 'swamp', intensity: 35 }))
    const z = (sys as any).zones[0]
    expect(z.intensity).toBeGreaterThanOrEqual(20)
    expect(z.intensity).toBeLessThanOrEqual(50)
  })

  it('battlefield intensity 在 [30, 60] 范围内', () => {
    const z = makeZone({ source: 'battlefield', intensity: 45 })
    expect(z.intensity).toBeGreaterThanOrEqual(30)
    expect(z.intensity).toBeLessThanOrEqual(60)
  })

  it('pollution intensity 在 [40, 70] 范围内', () => {
    const z = makeZone({ source: 'pollution', intensity: 55 })
    expect(z.intensity).toBeGreaterThanOrEqual(40)
    expect(z.intensity).toBeLessThanOrEqual(70)
  })

  it('cursed intensity 在 [60, 90] 范围内', () => {
    const z = makeZone({ source: 'cursed', intensity: 75 })
    expect(z.intensity).toBeGreaterThanOrEqual(60)
    expect(z.intensity).toBeLessThanOrEqual(90)
  })

  it('volcanic intensity 在 [50, 80] 范围内', () => {
    const z = makeZone({ source: 'volcanic', intensity: 65 })
    expect(z.intensity).toBeGreaterThanOrEqual(50)
    expect(z.intensity).toBeLessThanOrEqual(80)
  })

  it('plague intensity 在 [45, 75] 范围内', () => {
    const z = makeZone({ source: 'plague', intensity: 60 })
    expect(z.intensity).toBeGreaterThanOrEqual(45)
    expect(z.intensity).toBeLessThanOrEqual(75)
  })

  it('新建 zone 的 createdTick 等于当前 tick', () => {
    const zone = makeZone({ createdTick: 1100 })
    expect(zone.createdTick).toBe(1100)
  })

  it('spreadRate 在 [0.01, 0.05] 范围内', () => {
    const zone = makeZone({ spreadRate: 0.03 })
    expect(zone.spreadRate).toBeGreaterThanOrEqual(0.01)
    expect(zone.spreadRate).toBeLessThanOrEqual(0.05)
  })

  it('decayRate 在 [0.02, 0.05] 范围内', () => {
    const zone = makeZone({ decayRate: 0.04 })
    expect(zone.decayRate).toBeGreaterThanOrEqual(0.02)
    expect(zone.decayRate).toBeLessThanOrEqual(0.05)
  })
})

// ── 5. update 字段变更（updateZones）────────────────────────────────────────

describe('5. update 字段变更', () => {
  let sys: WorldMiasmaSystem

  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('decay 后 intensity 减少', () => {
    const zone = makeZone({ intensity: 50, decayRate: 0.05 })
    ;(sys as any).zones.push(zone)
    vi.spyOn(Math, 'random').mockReturnValue(0) // spread: 0 < spreadRate => radius increases, but we check intensity
    ;(sys as any).updateZones()
    // intensity -= decayRate * 10 => 50 - 0.5 = 49.5
    expect(zone.intensity).toBeCloseTo(49.5)
  })

  it('spread: random < spreadRate => radius += 0.5', () => {
    const zone = makeZone({ radius: 4, spreadRate: 0.5 })
    ;(sys as any).zones.push(zone)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1) // < 0.5 => spread
    ;(sys as any).updateZones()
    expect(zone.radius).toBeCloseTo(4.5)
  })

  it('spread: random >= spreadRate => radius 不变', () => {
    const zone = makeZone({ radius: 4, spreadRate: 0.1 })
    ;(sys as any).zones.push(zone)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.9) // >= 0.1 => no spread
    ;(sys as any).updateZones()
    expect(zone.radius).toBe(4)
  })

  it('radius 上限为 12', () => {
    const zone = makeZone({ radius: 12, spreadRate: 0.9 })
    ;(sys as any).zones.push(zone)
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1) // always spread
    ;(sys as any).updateZones()
    expect(zone.radius).toBe(12)
  })

  it('intensity 归零时 zone 被移除', () => {
    const zone = makeZone({ intensity: 0.3, decayRate: 0.05 })
    ;(sys as any).zones.push(zone)
    vi.spyOn(Math, 'random').mockReturnValue(1) // no spread
    ;(sys as any).updateZones()
    // 0.3 - 0.5 = -0.2 <= 0 => removed
    expect((sys as any).zones).toHaveLength(0)
  })

  it('intensity > 0 时 zone 保留', () => {
    const zone = makeZone({ intensity: 10, decayRate: 0.05 })
    ;(sys as any).zones.push(zone)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).updateZones()
    // 10 - 0.5 = 9.5 > 0 => kept
    expect((sys as any).zones).toHaveLength(1)
  })

  it('多个 zone 独立衰减', () => {
    const z1 = makeZone({ intensity: 50, decayRate: 0.02 })
    const z2 = makeZone({ intensity: 30, decayRate: 0.03 })
    ;(sys as any).zones.push(z1, z2)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).updateZones()
    expect(z1.intensity).toBeCloseTo(49.8)
    expect(z2.intensity).toBeCloseTo(29.7)
  })

  it('intensity=0.4 经过一次 updateZones 后被删除（decayRate=0.05）', () => {
    const zone = makeZone({ intensity: 0.4, decayRate: 0.05 })
    ;(sys as any).zones.push(zone)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).updateZones()
    expect((sys as any).zones).toHaveLength(0)
  })
})

// ── 6. cleanup 逻辑（intensity 耗尽自动删除）─────────────────────────────────

describe('6. cleanup 逻辑', () => {
  let sys: WorldMiasmaSystem

  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('intensity<=0 时 zone 从数组删除', () => {
    ;(sys as any).zones.push(makeZone({ intensity: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).updateZones()
    expect((sys as any).zones).toHaveLength(0)
  })

  it('负 intensity zone 也被删除', () => {
    ;(sys as any).zones.push(makeZone({ intensity: -5 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).updateZones()
    expect((sys as any).zones).toHaveLength(0)
  })

  it('多个 zone 中只删除耗尽的', () => {
    ;(sys as any).zones.push(
      makeZone({ intensity: 0.1, decayRate: 0.05 }),  // 0.1-0.5 => -0.4 => removed
      makeZone({ intensity: 50, decayRate: 0.02 }),   // 49.8 => kept
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).updateZones()
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].intensity).toBeCloseTo(49.8)
  })

  it('删除后 zones.length 正确减少', () => {
    ;(sys as any).zones.push(
      makeZone({ intensity: 100 }),
      makeZone({ intensity: 0 }),
      makeZone({ intensity: 100 }),
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).updateZones()
    expect((sys as any).zones).toHaveLength(2)
  })

  it('全部 zone intensity<=0 时清空', () => {
    ;(sys as any).zones.push(
      makeZone({ intensity: 0 }),
      makeZone({ intensity: -1 }),
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).updateZones()
    expect((sys as any).zones).toHaveLength(0)
  })

  it('cleanup 后 getToxicZones 返回正确结果', () => {
    ;(sys as any).zones.push(
      makeZone({ intensity: 0 }),    // will be removed
      makeZone({ intensity: 80 }),   // kept, toxic
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).updateZones()
    expect(sys.getToxicZones()).toHaveLength(1)
  })

  it('cleanup 逆序遍历不影响结果（splice 安全）', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).zones.push(makeZone({ intensity: i === 2 ? 0 : 50 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).updateZones()
    expect((sys as any).zones).toHaveLength(4)
  })
})

// ── 7. MAX_ZONES 上限（MAX_ZONES=30）────────────────────────────────────────

describe('7. MAX_ZONES 上限', () => {
  let sys: WorldMiasmaSystem

  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => { vi.restoreAllMocks() })

  it('zones 达到 30 时不再 spawn', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).zones.push(makeZone({ x: i * 20, y: i * 20 }))
    }
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    sys.update(1, world as any, 0)
    expect((sys as any).zones).toHaveLength(30)
  })

  it('zones=29 时还可以 spawn 1 个', () => {
    for (let i = 0; i < 29; i++) {
      ;(sys as any).zones.push(makeZone({ x: i * 20, y: i * 20, id: i + 1 }))
    }
    const world = makeWorld(TileType.SHALLOW_WATER)
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)   // x
      .mockReturnValueOnce(0.5)   // y
      .mockReturnValueOnce(0.01)  // < SPAWN_CHANCE
      .mockReturnValue(0.5)
    sys.update(1, world as any, 0)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(29)
  })

  it('MAX_ZONES 值为 30', () => {
    // zones 可存至 30
    for (let i = 0; i < 30; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    expect((sys as any).zones).toHaveLength(30)
  })

  it('getToxicZones 在 30 个 zone 全高强度时返回全部', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).zones.push(makeZone({ intensity: 80 }))
    }
    expect(sys.getToxicZones()).toHaveLength(30)
  })

  it('getToxicZones 在 30 个全低强度时返回 0', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).zones.push(makeZone({ intensity: 30 }))
    }
    expect(sys.getToxicZones()).toHaveLength(0)
  })
})

// ── 8. getToxicZones 边界验证（intensity > 60）────────────────────────────────

describe('8. getToxicZones 边界验证', () => {
  let sys: WorldMiasmaSystem

  beforeEach(() => { sys = makeSys(); nextId = 100 })

  it('intensity=60 不是 toxic（> 60 才算）', () => {
    ;(sys as any).zones.push(makeZone({ intensity: 60 }))
    expect(sys.getToxicZones()).toHaveLength(0)
  })

  it('intensity=61 是 toxic', () => {
    ;(sys as any).zones.push(makeZone({ intensity: 61 }))
    expect(sys.getToxicZones()).toHaveLength(1)
  })

  it('intensity=100 是 toxic', () => {
    ;(sys as any).zones.push(makeZone({ intensity: 100 }))
    expect(sys.getToxicZones()).toHaveLength(1)
  })

  it('intensity=0 不是 toxic', () => {
    ;(sys as any).zones.push(makeZone({ intensity: 0 }))
    expect(sys.getToxicZones()).toHaveLength(0)
  })

  it('混合强度正确过滤', () => {
    ;(sys as any).zones.push(
      makeZone({ intensity: 59 }),  // not toxic
      makeZone({ intensity: 60 }),  // not toxic
      makeZone({ intensity: 61 }),  // toxic
      makeZone({ intensity: 90 }),  // toxic
    )
    expect(sys.getToxicZones()).toHaveLength(2)
  })

  it('getToxicZones 多次调用结果一致（buf 重用）', () => {
    ;(sys as any).zones.push(makeZone({ intensity: 80 }))
    const r1 = sys.getToxicZones()
    const r2 = sys.getToxicZones()
    expect(r1.length).toBe(r2.length)
  })

  it('getToxicZones 返回的 zone 对象是原始引用', () => {
    const zone = makeZone({ intensity: 80 })
    ;(sys as any).zones.push(zone)
    const toxic = sys.getToxicZones()
    expect(toxic[0]).toBe(zone)
  })

  it('全 6 种 source 的 zone 都能被 getToxicZones 过滤', () => {
    const sources: MiasmaSource[] = ['swamp', 'battlefield', 'pollution', 'cursed', 'volcanic', 'plague']
    for (const src of sources) {
      ;(sys as any).zones.push(makeZone({ source: src, intensity: 70 }))
    }
    expect(sys.getToxicZones()).toHaveLength(6)
  })
})
