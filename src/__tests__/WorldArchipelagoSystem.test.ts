import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldArchipelagoSystem } from '../systems/WorldArchipelagoSystem'
import type { Archipelago } from '../systems/WorldArchipelagoSystem'

const CHECK_INTERVAL = 2900
// TileType: DEEP_WATER=0, SHALLOW_WATER=1
// getTile 返回 5 可阻止 spawn

let nextId = 1
function makeSys() { return new WorldArchipelagoSystem() }
function makeArchipelago(overrides: Partial<Archipelago> = {}): Archipelago {
  return {
    id: nextId++,
    x: 40, y: 50,
    radius: 20,
    islandCount: 8,
    volcanicActivity: 30,
    coralGrowth: 60,
    biodiversity: 80,
    seaDepth: 50,
    tick: 0,
    ...overrides,
  }
}

/** getTile 返回 5，既非 DEEP_WATER(0) 也非 SHALLOW_WATER(1)，阻止 spawn */
const makeWorld = () => ({ width: 200, height: 200, getTile: () => 5 }) as any
const em = {} as any

describe('WorldArchipelagoSystem', () => {
  let sys: WorldArchipelagoSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 初始状态 ──────────────────────────────���─────────────────────────────────
  it('初始 archipelagos 为空', () => {
    expect((sys as any).archipelagos).toHaveLength(0)
  })

  it('nextId 初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── CHECK_INTERVAL 节流 ─────────────────────────────────────────────────────
  it('tick < CHECK_INTERVAL 时不更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick == CHECK_INTERVAL 时更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续两次 update 后 lastCheck 更新到最新 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('getTile 返回 5 时不 spawn，archipelagos 保持为空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001) // < FORM_CHANCE=0.0015
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos).toHaveLength(0)
  })

  // ── 字段数据测试 ────────────────────────────────────────────────────────────
  it('注入后 archipelagos 长度正确', () => {
    ;(sys as any).archipelagos.push(makeArchipelago())
    expect((sys as any).archipelagos).toHaveLength(1)
  })

  it('注入后字段值正确', () => {
    ;(sys as any).archipelagos.push(makeArchipelago({ islandCount: 5, biodiversity: 65 }))
    const a = (sys as any).archipelagos[0]
    expect(a.islandCount).toBe(5)
    expect(a.biodiversity).toBe(65)
  })

  it('注入3个后 archipelagos 长度为3', () => {
    ;(sys as any).archipelagos.push(makeArchipelago())
    ;(sys as any).archipelagos.push(makeArchipelago())
    ;(sys as any).archipelagos.push(makeArchipelago())
    expect((sys as any).archipelagos).toHaveLength(3)
  })

  // ── 字段更新：coralGrowth 每次 +0.008（上限80）────────────────────────────
  it('coralGrowth 每次 update 增长 0.008', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).archipelagos.push(makeArchipelago({ coralGrowth: 50 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos[0].coralGrowth).toBeCloseTo(50.008, 5)
  })

  it('coralGrowth 达到上限80后不再增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).archipelagos.push(makeArchipelago({ coralGrowth: 79.999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos[0].coralGrowth).toBe(80)
  })

  // ── 字段更新：biodiversity 每次 +0.006（上限90）──────────────────────────
  it('biodiversity 每次 update 增长 0.006', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).archipelagos.push(makeArchipelago({ biodiversity: 70 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos[0].biodiversity).toBeCloseTo(70.006, 5)
  })

  it('biodiversity 达到上限90后不再增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).archipelagos.push(makeArchipelago({ biodiversity: 89.999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos[0].biodiversity).toBe(90)
  })

  // ── 字段更新：volcanicActivity 范围限制 [0, 50] ───────────────────────────
  it('volcanicActivity 不低于 0（Math.random=0 时偏移 -0.52*0.2）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).archipelagos.push(makeArchipelago({ volcanicActivity: 0.01 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos[0].volcanicActivity).toBeGreaterThanOrEqual(0)
  })

  it('volcanicActivity 不超过 50（Math.random=1 时偏移 +0.48*0.2）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).archipelagos.push(makeArchipelago({ volcanicActivity: 49.99 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).archipelagos[0].volcanicActivity).toBeLessThanOrEqual(50)
  })

  // ── cleanup：tick < cutoff (tick - 98000) 时删除 ──────────────────────────
  it('超过存活时限的 archipelago 被删除（cutoff 公式）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // cutoff = 100000 - 98000 = 2000; a.tick=0 < 2000 => 删除
    ;(sys as any).archipelagos.push(makeArchipelago({ tick: 0 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).archipelagos).toHaveLength(0)
  })

  it('未超存活时限的 archipelago 保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // cutoff = 100000 - 98000 = 2000; a.tick=3000 > 2000 => 保留
    ;(sys as any).archipelagos.push(makeArchipelago({ tick: 3000 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).archipelagos).toHaveLength(1)
  })

  it('混合：过期删除，新的保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // cutoff = 100000 - 98000 = 2000
    ;(sys as any).archipelagos.push(makeArchipelago({ tick: 0 }))    // 过期
    ;(sys as any).archipelagos.push(makeArchipelago({ tick: 3000 })) // 保留
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).archipelagos).toHaveLength(1)
    expect((sys as any).archipelagos[0].tick).toBe(3000)
  })

  it('多个过期 archipelago 全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // cutoff = 100000 - 98000 = 2000
    ;(sys as any).archipelagos.push(makeArchipelago({ tick: 0 }))
    ;(sys as any).archipelagos.push(makeArchipelago({ tick: 1000 }))
    ;(sys as any).archipelagos.push(makeArchipelago({ tick: 1999 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).archipelagos).toHaveLength(0)
  })

  it('tick 恰好等于 cutoff 边界时保留（a.tick === cutoff 不删除）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // cutoff = 100000 - 98000 = 2000; a.tick=2000 => NOT < cutoff => 保留
    ;(sys as any).archipelagos.push(makeArchipelago({ tick: 2000 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).archipelagos).toHaveLength(1)
  })
})
