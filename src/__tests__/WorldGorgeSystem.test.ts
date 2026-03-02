import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldGorgeSystem } from '../systems/WorldGorgeSystem'
import type { Gorge } from '../systems/WorldGorgeSystem'

// TileType: DEEP_WATER=0, SHALLOW_WATER=1, SAND=2, GRASS=3, FOREST=4, MOUNTAIN=5
const CHECK_INTERVAL = 2630
const FORM_CHANCE = 0.0014
const MAX_GORGES = 15

// world where getTile returns SAND (2) — blocks spawn (needs MOUNTAIN=5 or FOREST=4)
const sandWorld = { width: 200, height: 200, getTile: () => 2 } as any
// world where getTile returns MOUNTAIN (5) — allows spawn
const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
// world where getTile returns FOREST (4) — allows spawn
const forestWorld = { width: 200, height: 200, getTile: () => 4 } as any

const em = {} as any

function makeSys(): WorldGorgeSystem { return new WorldGorgeSystem() }
let nextId = 1
function makeGorge(overrides: Partial<Gorge> = {}): Gorge {
  return {
    id: nextId++, x: 15, y: 25,
    length: 20, depth: 40, wallHeight: 60,
    riverFlow: 20, rockHardness: 50, spectacle: 50,
    tick: 0,
    ...overrides
  }
}

describe('WorldGorgeSystem', () => {
  let sys: WorldGorgeSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 基础状态 ──────────────────────────────────────────────────
  it('初始gorges数组为空', () => {
    expect((sys as any).gorges).toHaveLength(0)
  })

  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('注入后可查询', () => {
    ;(sys as any).gorges.push(makeGorge())
    expect((sys as any).gorges).toHaveLength(1)
  })

  it('多个峡谷全部保留', () => {
    ;(sys as any).gorges.push(makeGorge(), makeGorge())
    expect((sys as any).gorges).toHaveLength(2)
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
    expect((sys as any).lastCheck).toBe(before) // 未更新
  })

  it('两次调用：第二次 tick 满足间隔则执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    const second = CHECK_INTERVAL * 2
    sys.update(1, sandWorld, em, second)
    expect((sys as any).lastCheck).toBe(second)
  })

  // ── spawn 阻断 ────────────────────────────────────────────────
  it('random=0.9 > FORM_CHANCE 时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).gorges).toHaveLength(0)
  })

  it('tile=SAND 时不spawn（需要MOUNTAIN或FOREST）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    expect((sys as any).gorges).toHaveLength(0)
  })

  it('random=0 且 tile=MOUNTAIN 时可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).gorges.length).toBeGreaterThanOrEqual(1)
  })

  it('random=0 且 tile=FOREST 时可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, forestWorld, em, CHECK_INTERVAL)
    expect((sys as any).gorges.length).toBeGreaterThanOrEqual(1)
  })

  // ── MAX 上限 ──────────────────────────────────────────────────
  it('gorges满MAX_GORGES时不再spawn', () => {
    for (let i = 0; i < MAX_GORGES; i++) {
      ;(sys as any).gorges.push(makeGorge({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).gorges).toHaveLength(MAX_GORGES)
  })

  it('gorges为MAX_GORGES-1时仍可spawn', () => {
    for (let i = 0; i < MAX_GORGES - 1; i++) {
      ;(sys as any).gorges.push(makeGorge({ tick: CHECK_INTERVAL }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).gorges.length).toBeGreaterThanOrEqual(MAX_GORGES)
  })

  // ── cleanup 逻辑 ──────────────────────────────────────────────
  it('过期记录（tick < cutoff=tick-91000）被删除', () => {
    const currentTick = 100000
    ;(sys as any).gorges.push(makeGorge({ tick: 0 })) // cutoff = 9000, 0 < 9000 → 删
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).gorges).toHaveLength(0)
  })

  it('未过期记录保留', () => {
    const currentTick = 100000
    const recentTick = currentTick - 50000 // 50000 < 91000 → 未过期
    ;(sys as any).gorges.push(makeGorge({ tick: recentTick }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).gorges).toHaveLength(1)
  })

  it('混合：过期删除、未过期保留', () => {
    const currentTick = 200000
    const expired = makeGorge({ tick: 0 })        // 过期
    const fresh = makeGorge({ tick: 160000 })     // 未过期
    ;(sys as any).gorges.push(expired, fresh)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).gorges).toHaveLength(1)
    expect((sys as any).gorges[0].id).toBe(fresh.id)
  })

  it('恰好在临界点的记录被删除（tick === cutoff）', () => {
    const currentTick = 91000
    ;(sys as any).gorges.push(makeGorge({ tick: 0 })) // cutoff = 0, tick(0) < cutoff(0)? NO，0 < 0 is false
    // 实际cutoff = 91000 - 91000 = 0，gorge.tick=0 不 < 0，故保留
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).gorges).toHaveLength(1)
  })

  it('tick恰好比cutoff小1时被删除', () => {
    const currentTick = 91001
    ;(sys as any).gorges.push(makeGorge({ tick: 0 })) // cutoff = 1, tick(0) < 1 → 删
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, currentTick)
    expect((sys as any).gorges).toHaveLength(0)
  })

  // ── 字段范围约束（spawn后验证） ────────────────────────────────
  it('spawn后 length 在 [10, 45] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    const g = (sys as any).gorges[0]
    expect(g.length).toBeGreaterThanOrEqual(10)
    expect(g.length).toBeLessThanOrEqual(45)
  })

  it('spawn后 depth 在 [20, 70] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    const g = (sys as any).gorges[0]
    expect(g.depth).toBeGreaterThanOrEqual(20)
    expect(g.depth).toBeLessThanOrEqual(70)
  })

  it('spawn后经update循环 wallHeight 在 clamp范围 [20, 100] 内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    const g = (sys as any).gorges[0]
    // spawn后立刻经update loop: Math.max(20, Math.min(100, ...))
    expect(g.wallHeight).toBeGreaterThanOrEqual(20)
    expect(g.wallHeight).toBeLessThanOrEqual(100)
  })

  it('spawn后经update循环 riverFlow 在 clamp范围 [5, 60] 内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    const g = (sys as any).gorges[0]
    // spawn后立刻经update loop: Math.max(5, Math.min(60, ...))
    expect(g.riverFlow).toBeGreaterThanOrEqual(5)
    expect(g.riverFlow).toBeLessThanOrEqual(60)
  })

  it('spawn后 rockHardness 在 [30, 80] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    const g = (sys as any).gorges[0]
    expect(g.rockHardness).toBeGreaterThanOrEqual(30)
    expect(g.rockHardness).toBeLessThanOrEqual(80)
  })

  it('spawn后经update循环 spectacle 在 clamp范围 [15, 80] 内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    const g = (sys as any).gorges[0]
    // spawn后立刻经update loop: Math.max(15, Math.min(80, ...))
    expect(g.spectacle).toBeGreaterThanOrEqual(15)
    expect(g.spectacle).toBeLessThanOrEqual(80)
  })

  it('spawn后记录的 tick 等于传入的当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).gorges[0].tick).toBe(CHECK_INTERVAL)
  })

  // ── 字段动态更新（每次 update 后变化约束） ─────────────────────
  it('多次update后 depth 不超过上限80', () => {
    ;(sys as any).gorges.push(makeGorge({ depth: 79, riverFlow: 60, rockHardness: 30, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 20; i++) {
      sys.update(1, sandWorld, em, CHECK_INTERVAL * (i + 2))
    }
    expect((sys as any).gorges[0].depth).toBeLessThanOrEqual(80)
  })

  it('多次update后 riverFlow 保持在 [5, 60] 范围内', () => {
    ;(sys as any).gorges.push(makeGorge({ riverFlow: 30, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 0; i < 20; i++) {
      sys.update(1, sandWorld, em, CHECK_INTERVAL * (i + 2))
    }
    const rf = (sys as any).gorges[0].riverFlow
    expect(rf).toBeGreaterThanOrEqual(5)
    expect(rf).toBeLessThanOrEqual(60)
  })

  it('多次update后 wallHeight 保持在 [20, 100] 范围内', () => {
    ;(sys as any).gorges.push(makeGorge({ wallHeight: 60, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 0; i < 20; i++) {
      sys.update(1, sandWorld, em, CHECK_INTERVAL * (i + 2))
    }
    const wh = (sys as any).gorges[0].wallHeight
    expect(wh).toBeGreaterThanOrEqual(20)
    expect(wh).toBeLessThanOrEqual(100)
  })

  it('多次update后 spectacle 保持在 [15, 80] 范围内', () => {
    ;(sys as any).gorges.push(makeGorge({ spectacle: 50, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    for (let i = 0; i < 20; i++) {
      sys.update(1, sandWorld, em, CHECK_INTERVAL * (i + 2))
    }
    const sp = (sys as any).gorges[0].spectacle
    expect(sp).toBeGreaterThanOrEqual(15)
    expect(sp).toBeLessThanOrEqual(80)
  })

  it('spawn的峡谷有唯一自增id', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL * 2)
    const ids = (sys as any).gorges.map((g: Gorge) => g.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
})
