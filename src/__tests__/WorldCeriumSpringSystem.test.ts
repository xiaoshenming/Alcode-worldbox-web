import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldCeriumSpringSystem } from '../systems/WorldCeriumSpringSystem'
import type { CeriumSpringZone } from '../systems/WorldCeriumSpringSystem'

const CHECK_INTERVAL = 2950
const MAX_ZONES = 32

// 安全 world mock：getTile 返回 0（DEEP_WATER）
// hasAdjacentTile 依赖 world.getTile，此处全返回 DEEP_WATER，
// nearWater 条件：adjacent SHALLOW_WATER(1) or DEEP_WATER(0)
// 但 hasAdjacentTile 检查的是指定 tileType，DEEP_WATER=0 ≠ SHALLOW_WATER(1) 且 ≠ MOUNTAIN(5)
// 然而 hasAdjacentTile(world, x, y, TileType.DEEP_WATER) 会返回 true！
// 因此使用 getTile:()=>2 (SAND) 才能保证 nearWater=false && nearMountain=false
const safeWorld = { width: 200, height: 200, getTile: () => 2 } as any
const em = {} as any

let nextId = 1
function makeZone(overrides: Partial<CeriumSpringZone> = {}): CeriumSpringZone {
  return {
    id: nextId++,
    x: 20, y: 30,
    ceriumContent: 40,
    springFlow: 50,
    monaziteLeaching: 60,
    mineralAbundance: 70,
    tick: 0,
    ...overrides,
  }
}

function makeSys(): WorldCeriumSpringSystem { return new WorldCeriumSpringSystem() }

describe('WorldCeriumSpringSystem', () => {
  let sys: WorldCeriumSpringSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 初始状态 ──────────────────────────────────────────────────
  it('初始无 Cerium 泉区', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── 内部数组操作 ──────────────────────────────────────────────
  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('返回内部引用一致', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })

  it('Cerium 泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.ceriumContent).toBe(40)
    expect(z.springFlow).toBe(50)
    expect(z.monaziteLeaching).toBe(60)
    expect(z.mineralAbundance).toBe(70)
  })

  it('多个泉区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────
  it('tick 未到 CHECK_INTERVAL 时不处理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick 到达 CHECK_INTERVAL 时才运行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续两次 update 在同一 CHECK_INTERVAL 内只触发一次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const lastCheck1 = (sys as any).lastCheck
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(lastCheck1) // 未重新触发
  })

  // ── Spawn 逻辑（nearWater 触发） ──────────────────────────────
  it('adjacent SHALLOW_WATER(1) 且 random < FORM_CHANCE 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    // getTile 返回 1（SHALLOW_WATER），hasAdjacentTile(SHALLOW_WATER) 会返回 true
    const waterWorld = { width: 200, height: 200, getTile: () => 1 } as any
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('adjacent MOUNTAIN(5) 且 random < FORM_CHANCE 时 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThan(0)
  })

  it('random > FORM_CHANCE 时不 spawn（即使 nearWater）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const waterWorld = { width: 200, height: 200, getTile: () => 1 } as any
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('SAND tile 不触发 nearWater/nearMountain，不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    sys.update(1, safeWorld, em, CHECK_INTERVAL) // safeWorld getTile=2(SAND)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('已达 MAX_ZONES 时不再 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone())
    }
    const waterWorld = { width: 200, height: 200, getTile: () => 1 } as any
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('spawn 后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    const waterWorld = { width: 200, height: 200, getTile: () => 1 } as any
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBeGreaterThan(1)
  })

  it('spawn 的泉区记录了正确 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    const waterWorld = { width: 200, height: 200, getTile: () => 1 } as any
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    if ((sys as any).zones.length > 0) {
      expect((sys as any).zones[0].tick).toBe(CHECK_INTERVAL)
    }
  })

  it('3 次 attempt 循环，最多可 spawn 3 个', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    const waterWorld = { width: 200, height: 200, getTile: () => 1 } as any
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones.length).toBeGreaterThanOrEqual(1)
    expect((sys as any).zones.length).toBeLessThanOrEqual(3)
  })

  // ── Cleanup 逻辑 ──────────────────────────────────────────────
  it('tick 超出 54000 的泉区被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 54001)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick 未超出 54000 的泉区保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL * 2
    ;(sys as any).cenotes = [] // 无关字段
    ;(sys as any).zones.push(makeZone({ tick: currentTick - 1000 }))
    sys.update(1, safeWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('过期和未过期混合时只删除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = CHECK_INTERVAL + 200000
    ;(sys as any).lastCheck = 0
    ;(sys as any).zones.push(makeZone({ tick: 0 }))               // 过期
    ;(sys as any).zones.push(makeZone({ tick: currentTick - 1000 })) // 未过期
    sys.update(1, safeWorld, em, currentTick)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(currentTick - 1000)
  })

  it('spawn 的泉区具有合理的 ceriumContent（40~100）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    const waterWorld = { width: 200, height: 200, getTile: () => 1 } as any
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    for (const z of (sys as any).zones) {
      expect(z.ceriumContent).toBeGreaterThanOrEqual(40)
      expect(z.ceriumContent).toBeLessThanOrEqual(100)
    }
  })

  it('spawn 的泉区具有合理的 springFlow（10~60）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002)
    const waterWorld = { width: 200, height: 200, getTile: () => 1 } as any
    sys.update(1, waterWorld, em, CHECK_INTERVAL)
    for (const z of (sys as any).zones) {
      expect(z.springFlow).toBeGreaterThanOrEqual(10)
      expect(z.springFlow).toBeLessThanOrEqual(60)
    }
  })
})
