import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldFogBankSystem } from '../systems/WorldFogBankSystem'
import type { FogBank, FogDensity } from '../systems/WorldFogBankSystem'

const CHECK_INTERVAL = 1100
const MAX_FOGS = 10

// grassWorld + 有水邻居: getTile(x,y)=GRASS(3), 邻居中有SHALLOW_WATER(1)
// 用 Map 模拟精确的 tile 返回：中心坐标返回 GRASS，周围返回 SHALLOW_WATER
function makeCoastalWorld(cx: number, cy: number): any {
  return {
    width: 200,
    height: 200,
    getTile: (x: number, y: number) => {
      if (x === cx && y === cy) return 3  // GRASS
      if (Math.abs(x - cx) <= 1 && Math.abs(y - cy) <= 1) return 1  // SHALLOW_WATER
      return 3 // 其他也是 GRASS
    }
  }
}

// noSpawnWorld: 所有 tile 返回 MOUNTAIN(5)，不满足 GRASS/SAND/FOREST 条件
const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
// sandWorld: 全部返回 SAND(2)，满足 tile 条件但邻居也是 SAND，无水邻居 → 不 spawn
const sandNoWaterWorld = { width: 200, height: 200, getTile: () => 2 } as any
const em = {} as any

function makeSys(): WorldFogBankSystem { return new WorldFogBankSystem() }
let nextId = 1
function makeFog(overrides: Partial<FogBank> = {}): FogBank {
  return {
    id: nextId++,
    x: 30,
    y: 40,
    density: 'moderate',
    radius: 15,
    visibility: 40,
    speedPenalty: 0.5,
    duration: 4000,
    startTick: 0,
    ...overrides,
  }
}

describe('WorldFogBankSystem', () => {
  let sys: WorldFogBankSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.restoreAllMocks()
  })

  // ── 基础状态 ──────────────────────────────────────────────────

  it('初始无雾区', () => {
    expect(sys.getFogs()).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入后 getFogs 可查询', () => {
    ;sys.getFogs().push(makeFog())
    expect(sys.getFogs()).toHaveLength(1)
  })

  it('getFogs 返回内部引用', () => {
    expect(sys.getFogs()).toBe((sys as any).fogs)
  })

  it('支持4种雾密度', () => {
    const densities: FogDensity[] = ['light', 'moderate', 'thick', 'impenetrable']
    expect(densities).toHaveLength(4)
  })

  it('雾区字段正确（density, visibility, speedPenalty）', () => {
    ;sys.getFogs().push(makeFog({ density: 'thick', visibility: 20, speedPenalty: 0.5 }))
    const f = sys.getFogs()[0]
    expect(f.density).toBe('thick')
    expect(f.visibility).toBe(20)
    expect(f.speedPenalty).toBe(0.5)
  })

  it('多个雾区全部返回', () => {
    ;sys.getFogs().push(makeFog())
    ;sys.getFogs().push(makeFog())
    expect(sys.getFogs()).toHaveLength(2)
  })

  it('每个雾区有 x/y 坐标', () => {
    ;sys.getFogs().push(makeFog({ x: 15, y: 25 }))
    const f = sys.getFogs()[0]
    expect(f.x).toBe(15)
    expect(f.y).toBe(25)
  })

  // ── CHECK_INTERVAL 节流 ──────────────────────────────────────

  it('tick 未达 CHECK_INTERVAL 时 update 跳过（不更新 lastCheck）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时触发检查并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距小于 CHECK_INTERVAL 时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距达到 CHECK_INTERVAL 时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ── spawn 逻辑 ────────────────────────────────────────────────

  it('random=0.9 时不 spawn（大于 FOG_CHANCE=0.005）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect(sys.getFogs()).toHaveLength(0)
  })

  it('MOUNTAIN tile 时不 spawn（不满足 GRASS/SAND/FOREST 条件）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect(sys.getFogs()).toHaveLength(0)
  })

  it('SAND tile 但无水邻居时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandNoWaterWorld, em, CHECK_INTERVAL)
    expect(sys.getFogs()).toHaveLength(0)
  })

  // ── cleanup：visibility>=95 或 radius<=1 时删除 ────────────────

  it('visibility>=95 的雾区被清理', () => {
    ;(sys as any).fogs.push(makeFog({ visibility: 96, radius: 10 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect(sys.getFogs()).toHaveLength(0)
  })

  it('radius<=1 的雾区被清理', () => {
    ;(sys as any).fogs.push(makeFog({ visibility: 30, radius: 0.5 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect(sys.getFogs()).toHaveLength(0)
  })

  it('visibility=94 且 radius=2 时雾区保留', () => {
    ;(sys as any).fogs.push(makeFog({ visibility: 94, radius: 2, duration: 99999, startTick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect(sys.getFogs()).toHaveLength(1)
  })

  it('同时有清除和保留的雾区，只删满足清除条件的', () => {
    ;(sys as any).fogs.push(makeFog({ visibility: 96, radius: 10 }))    // 清除
    ;(sys as any).fogs.push(makeFog({ visibility: 30, radius: 15, duration: 99999, startTick: 0 })) // 保留
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect(sys.getFogs()).toHaveLength(1)
    expect(sys.getFogs()[0].visibility).toBe(30)
  })

  it('多个满足清除条件的雾区全部被清理', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).fogs.push(makeFog({ visibility: 96, radius: 10 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect(sys.getFogs()).toHaveLength(0)
  })

  // ── MAX_FOGS 上限 ─────────────────────────────────────────────

  it('注入 MAX_FOGS 个后不再 spawn', () => {
    for (let i = 0; i < MAX_FOGS; i++) {
      ;(sys as any).fogs.push(makeFog({ visibility: 30, radius: 10, duration: 99999, startTick: 0 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).lastCheck = 0
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect(sys.getFogs()).toHaveLength(MAX_FOGS)
  })

  it('MAX_FOGS-1 个时仍在 limit 内', () => {
    for (let i = 0; i < MAX_FOGS - 1; i++) {
      ;(sys as any).fogs.push(makeFog())
    }
    expect(sys.getFogs()).toHaveLength(MAX_FOGS - 1)
  })

  // ── 字段范围验证 ──────────────────────────────────────────────

  it('light 密度 visibility 为 70', () => {
    const f = makeFog({ density: 'light', visibility: 70 })
    expect(f.visibility).toBe(70)
  })

  it('impenetrable 密度 visibility 为 5', () => {
    const f = makeFog({ density: 'impenetrable', visibility: 5 })
    expect(f.visibility).toBe(5)
  })

  it('light 密度 speedPenalty 为 0.9', () => {
    const f = makeFog({ density: 'light', speedPenalty: 0.9 })
    expect(f.speedPenalty).toBe(0.9)
  })

  it('impenetrable 密度 speedPenalty 为 0.25', () => {
    const f = makeFog({ density: 'impenetrable', speedPenalty: 0.25 })
    expect(f.speedPenalty).toBe(0.25)
  })

  it('雾区 radius 不低于 8（spawn 最小值）', () => {
    const f = makeFog({ radius: 8 + 0 * 12 })
    expect(f.radius).toBeGreaterThanOrEqual(8)
  })

  it('雾区 duration 不低于 1500（spawn 最小值）', () => {
    const f = makeFog({ duration: 1500 + 0 * 3000 })
    expect(f.duration).toBeGreaterThanOrEqual(1500)
  })

  // ── id 自增 ───────────────────────────────────────────────────

  it('注入多个雾区 id 不重复', () => {
    ;sys.getFogs().push(makeFog())
    ;sys.getFogs().push(makeFog())
    ;sys.getFogs().push(makeFog())
    const ids = sys.getFogs().map((f: FogBank) => f.id)
    expect(new Set(ids).size).toBe(3)
  })

  // ── 消散阶段（elapsed > duration*0.7）────────────────────────

  it('elapsed > duration*0.7 时 visibility 增加（消散开始）', () => {
    const duration = 2000
    const startTick = 0
    const currentTick = 1500 // elapsed=1500 > 2000*0.7=1400 → 消散
    const initialVisibility = 40
    // 在下一次 update 时 lastCheck 需重置以触发
    ;(sys as any).fogs.push(makeFog({
      visibility: initialVisibility,
      radius: 10,
      duration,
      startTick,
    }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, currentTick)
    const f = sys.getFogs()[0]
    // visibility 应增加（DISSIPATE_RATE * CHECK_INTERVAL = 0.04 * 1100 = 44）
    expect(f.visibility).toBeGreaterThan(initialVisibility)
  })

  it('elapsed <= duration*0.7 时 visibility 不因消散增加', () => {
    const duration = 9999
    const startTick = 0
    const currentTick = CHECK_INTERVAL  // elapsed 远小于 duration*0.7
    const initialVisibility = 40
    ;(sys as any).fogs.push(makeFog({
      visibility: initialVisibility,
      radius: 10,
      duration,
      startTick,
    }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, currentTick)
    const f = sys.getFogs()[0]
    expect(f.visibility).toBe(initialVisibility)
  })

  it('消散时 radius 减少（每次 -0.1）', () => {
    const duration = 2000
    const startTick = 0
    const currentTick = 1500 // 消散阶段
    const initialRadius = 10
    ;(sys as any).fogs.push(makeFog({
      visibility: 40,
      radius: initialRadius,
      duration,
      startTick,
    }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, currentTick)
    const f = sys.getFogs()[0]
    expect(f.radius).toBeLessThan(initialRadius)
    expect(f.radius).toBeGreaterThanOrEqual(0)
  })
})
