import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldGrottoSystem } from '../systems/WorldGrottoSystem'
import type { Grotto } from '../systems/WorldGrottoSystem'

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5
const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.0016
const MAX_GROTTOS = 14

// world where getTile returns SAND (2) — blocks spawn (needs MOUNTAIN=5 or FOREST=4)
const sandWorld = { width: 200, height: 200, getTile: () => 2 } as any
// world where getTile returns MOUNTAIN (5) — allows spawn
const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
// world where getTile returns FOREST (4) — allows spawn
const forestWorld = { width: 200, height: 200, getTile: () => 4 } as any

const em = {} as any

function makeSys(): WorldGrottoSystem { return new WorldGrottoSystem() }
let nextId = 1
function makeGrotto(overrides: Partial<Grotto> = {}): Grotto {
  return {
    id: nextId++, x: 15, y: 25,
    depth: 25, waterLevel: 15,
    stalactites: 10, luminosity: 12,
    humidity: 70, biodiversity: 25,
    tick: 0,
    ...overrides
  }
}

describe('WorldGrottoSystem', () => {
  let sys: WorldGrottoSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 基础状态 ──────────────────────────────────────────────────
  it('初始grottos数组为空', () => {
    expect((sys as any).grottos).toHaveLength(0)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初���nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('注入后可查询', () => {
    ;(sys as any).grottos.push(makeGrotto())
    expect((sys as any).grottos).toHaveLength(1)
  })

  it('多个岩洞全部保留', () => {
    ;(sys as any).grottos.push(makeGrotto(), makeGrotto())
    expect((sys as any).grottos).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────
  it('tick < CHECK_INTERVAL 时跳过，lastCheck不变', () => {
    sys.update(1, sandWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 阻断spawn
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL 时更新 lastCheck 到当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const t = CHECK_INTERVAL + 500
    sys.update(1, sandWorld, em, t)
    expect((sys as any).lastCheck).toBe(t)
  })

  it('两次调用：第二次 tick 不足间隔则跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    const before = (sys as any).lastCheck
    sys.update(1, sandWorld, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(before)
  })

  it('两次调用：第二次 tick 满足间隔则执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    const second = CHECK_INTERVAL * 2
    sys.update(1, sandWorld, em, second)
    expect((sys as any).lastCheck).toBe(second)
  })

  // ── spawn 阻断 ──────────────────────���─────────────────────────
  it('random=0.9 > FORM_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).grottos).toHaveLength(0)
  })

  it('tile=SAND 时不spawn（需要MOUNTAIN或FOREST）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    expect((sys as any).grottos).toHaveLength(0)
  })

  it('tile=GRASS 时不spawn', () => {
    const grassWorld = { width: 200, height: 200, getTile: () => 3 } as any
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).grottos).toHaveLength(0)
  })

  it('random=0 且 tile=MOUNTAIN 时可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).grottos.length).toBeGreaterThanOrEqual(1)
  })

  it('random=0 且 tile=FOREST 时可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, forestWorld, em, CHECK_INTERVAL)
    expect((sys as any).grottos.length).toBeGreaterThanOrEqual(1)
  })

  // ── MAX 上限 ──────────────────────────────────────────────────
  it('grottos满MAX_GROTTOS时不再spawn', () => {
    for (let i = 0; i < MAX_GROTTOS; i++) {
      ;(sys as any).grottos.push(makeGrotto({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).grottos).toHaveLength(MAX_GROTTOS)
  })

  it('grottos为MAX_GROTTOS-1时仍可spawn', () => {
    for (let i = 0; i < MAX_GROTTOS - 1; i++) {
      ;(sys as any).grottos.push(makeGrotto({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).grottos.length).toBeGreaterThanOrEqual(MAX_GROTTOS)
  })

  // ── cleanup 逻辑 ──────────────────────────────────────────────
  it('过期记录（tick < cutoff=tick-95000）被删除', () => {
    const currentTick = 100000
    ;(sys as any).grottos.push(makeGrotto({ tick: 0 })) // cutoff=5000, 0 < 5000 → 删
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).grottos).toHaveLength(0)
  })

  it('未过期记录保留', () => {
    const currentTick = 100000
    const recentTick = currentTick - 50000 // 50000 < 95000 → 未过期
    ;(sys as any).grottos.push(makeGrotto({ tick: recentTick }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).grottos).toHaveLength(1)
  })

  it('混合：过期删除、未过期保留', () => {
    const currentTick = 200000
    const expired = makeGrotto({ tick: 0 })       // 过期
    const fresh = makeGrotto({ tick: 150000 })    // 未过期
    ;(sys as any).grottos.push(expired, fresh)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).grottos).toHaveLength(1)
    expect((sys as any).grottos[0].id).toBe(fresh.id)
  })

  it('恰好在 cutoff 边界不删除（tick === cutoff，<不成立）', () => {
    const currentTick = 95000
    ;(sys as any).grottos.push(makeGrotto({ tick: 0 })) // cutoff=0, 0<0 false → 保留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).grottos).toHaveLength(1)
  })

  it('tick比cutoff小1时被删除', () => {
    const currentTick = 95001
    ;(sys as any).grottos.push(makeGrotto({ tick: 0 })) // cutoff=1, 0 < 1 → 删
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).grottos).toHaveLength(0)
  })

  // ── 字段范围约束（spawn后验证） ────────────────────────────────
  it('spawn后 depth 在 [10, 50] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    const g = (sys as any).grottos[0]
    expect(g.depth).toBeGreaterThanOrEqual(10)
    expect(g.depth).toBeLessThanOrEqual(50)
  })

  it('spawn后 waterLevel 在 [0, 30] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    const g = (sys as any).grottos[0]
    expect(g.waterLevel).toBeGreaterThanOrEqual(0)
    expect(g.waterLevel).toBeLessThanOrEqual(30)
  })

  it('spawn后 stalactites 在 [5, 24] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    const g = (sys as any).grottos[0]
    expect(g.stalactites).toBeGreaterThanOrEqual(5)
    expect(g.stalactites).toBeLessThanOrEqual(24)
  })

  it('spawn后 luminosity 在 [5, 25] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    const g = (sys as any).grottos[0]
    expect(g.luminosity).toBeGreaterThanOrEqual(5)
    expect(g.luminosity).toBeLessThanOrEqual(25)
  })

  it('spawn后经update循环 humidity 在 clamp范围 [30, 98] 内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    const g = (sys as any).grottos[0]
    // spawn后立刻经update loop: Math.max(30, Math.min(98, ...))
    expect(g.humidity).toBeGreaterThanOrEqual(30)
    expect(g.humidity).toBeLessThanOrEqual(98)
  })

  it('spawn后 biodiversity 在 [10, 40] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    const g = (sys as any).grottos[0]
    expect(g.biodiversity).toBeGreaterThanOrEqual(10)
    expect(g.biodiversity).toBeLessThanOrEqual(40)
  })

  it('spawn后记录的 tick 等于传入的当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).grottos[0].tick).toBe(CHECK_INTERVAL)
  })

  // ── 字段动态更新（每次 update 后变化约束） ─────────────────────
  it('多次update后 stalactites 不超过上限40', () => {
    ;(sys as any).grottos.push(makeGrotto({ stalactites: 39.9, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 20; i++) {
      sys.update(1, sandWorld, em, CHECK_INTERVAL * (i + 2))
    }
    expect((sys as any).grottos[0].stalactites).toBeLessThanOrEqual(40)
  })

  it('多次update后 waterLevel 保持在 [0, 50] 范围内', () => {
    ;(sys as any).grottos.push(makeGrotto({ waterLevel: 25, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 0; i < 20; i++) {
      sys.update(1, sandWorld, em, CHECK_INTERVAL * (i + 2))
    }
    const wl = (sys as any).grottos[0].waterLevel
    expect(wl).toBeGreaterThanOrEqual(0)
    expect(wl).toBeLessThanOrEqual(50)
  })

  it('多次update后 humidity 保持在 [30, 98] 范围内', () => {
    ;(sys as any).grottos.push(makeGrotto({ humidity: 70, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 0; i < 20; i++) {
      sys.update(1, sandWorld, em, CHECK_INTERVAL * (i + 2))
    }
    const h = (sys as any).grottos[0].humidity
    expect(h).toBeGreaterThanOrEqual(30)
    expect(h).toBeLessThanOrEqual(98)
  })

  it('多次update后 biodiversity 不超过上限50', () => {
    ;(sys as any).grottos.push(makeGrotto({ biodiversity: 49.9, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 20; i++) {
      sys.update(1, sandWorld, em, CHECK_INTERVAL * (i + 2))
    }
    expect((sys as any).grottos[0].biodiversity).toBeLessThanOrEqual(50)
  })

  it('spawn的岩洞有唯一自增id', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL * 2)
    const ids = (sys as any).grottos.map((g: Grotto) => g.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
})
