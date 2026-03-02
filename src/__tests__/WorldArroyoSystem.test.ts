import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldArroyoSystem } from '../systems/WorldArroyoSystem'
import type { Arroyo } from '../systems/WorldArroyoSystem'

const CHECK_INTERVAL = 2550
// TileType: SAND=2, GRASS=3；getTile 返回 5 阻止 spawn

let nextId = 1
function makeSys() { return new WorldArroyoSystem() }
function makeArroyo(overrides: Partial<Arroyo> = {}): Arroyo {
  return {
    id: nextId++,
    x: 15, y: 25,
    length: 20,
    depth: 3,
    waterPresence: 40,
    sedimentLoad: 20,
    flashFloodRisk: 30,
    spectacle: 25,
    tick: 0,
    ...overrides,
  }
}

/** getTile 返回 5，既非 SAND(2) 也非 GRASS(3)，阻止 spawn */
const makeWorld = () => ({ width: 200, height: 200, getTile: () => 5 }) as any
const em = {} as any

describe('WorldArroyoSystem', () => {
  let sys: WorldArroyoSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 初始状态 ────────────────────────────────────────────────────────────────
  it('初始 arroyos 为空', () => {
    expect((sys as any).arroyos).toHaveLength(0)
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

  it('getTile 返回 5 时不 spawn，arroyos 保持为空', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0001) // < FORM_CHANCE=0.0016
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos).toHaveLength(0)
  })

  // ── 字段数据测试 ────────────────────────────────────────────────────────────
  it('注入后 arroyos 长度正确', () => {
    ;(sys as any).arroyos.push(makeArroyo())
    expect((sys as any).arroyos).toHaveLength(1)
  })

  it('注入后字段值正确', () => {
    ;(sys as any).arroyos.push(makeArroyo({ flashFloodRisk: 55, sedimentLoad: 30 }))
    const a = (sys as any).arroyos[0]
    expect(a.flashFloodRisk).toBe(55)
    expect(a.sedimentLoad).toBe(30)
  })

  it('注入3个后 arroyos 长度为3', () => {
    ;(sys as any).arroyos.push(makeArroyo())
    ;(sys as any).arroyos.push(makeArroyo())
    ;(sys as any).arroyos.push(makeArroyo())
    expect((sys as any).arroyos).toHaveLength(3)
  })

  // ── 字段更新：depth += sedimentLoad * 0.00003 ────────────────────────────
  it('depth 每次 update 按 sedimentLoad 增长', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).arroyos.push(makeArroyo({ depth: 3, sedimentLoad: 20 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    // depth = 3 + 20 * 0.00003 = 3 + 0.0006
    expect((sys as any).arroyos[0].depth).toBeCloseTo(3.0006, 6)
  })

  it('depth 最大不超过 20', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).arroyos.push(makeArroyo({ depth: 19.9999, sedimentLoad: 100 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos[0].depth).toBeLessThanOrEqual(20)
  })

  // ── 字段更新：waterPresence 范围 [0, 80] ─────────────────────────────────
  it('waterPresence 不低于 0（Math.random=0 偏移 -0.52*0.3）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).arroyos.push(makeArroyo({ waterPresence: 0.01 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos[0].waterPresence).toBeGreaterThanOrEqual(0)
  })

  it('waterPresence 不超过 80（Math.random=1 偏移 +0.48*0.3）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arroyos.push(makeArroyo({ waterPresence: 79.99 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos[0].waterPresence).toBeLessThanOrEqual(80)
  })

  // ── 字段更新：flashFloodRisk 范围 [5, 80] ────────────────────────────────
  it('flashFloodRisk 不低于 5（Math.random=0 偏移 -0.48*0.2）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).arroyos.push(makeArroyo({ flashFloodRisk: 5.01 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos[0].flashFloodRisk).toBeGreaterThanOrEqual(5)
  })

  it('flashFloodRisk 不超过 80（Math.random=1 偏移 +0.52*0.2）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arroyos.push(makeArroyo({ flashFloodRisk: 79.99 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos[0].flashFloodRisk).toBeLessThanOrEqual(80)
  })

  // ── 字段更新：spectacle 范围 [5, 60] ─────────────────────────────────────
  it('spectacle 不低于 5（Math.random=0 偏移 -0.47*0.11）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).arroyos.push(makeArroyo({ spectacle: 5.001 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos[0].spectacle).toBeGreaterThanOrEqual(5)
  })

  it('spectacle 不超过 60（Math.random=1 偏移 +0.53*0.11）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arroyos.push(makeArroyo({ spectacle: 59.99 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).arroyos[0].spectacle).toBeLessThanOrEqual(60)
  })

  // ── cleanup：tick < cutoff (tick - 86000) 时删除 ─────────────────────────
  it('超过存活时限的 arroyo 被删除（cutoff 公式）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // cutoff = 90000 - 86000 = 4000; a.tick=0 < 4000 => 删除
    ;(sys as any).arroyos.push(makeArroyo({ tick: 0 }))
    sys.update(1, makeWorld(), em, 90000)
    expect((sys as any).arroyos).toHaveLength(0)
  })

  it('未超存活时限的 arroyo 保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // cutoff = 90000 - 86000 = 4000; a.tick=5000 > 4000 => 保留
    ;(sys as any).arroyos.push(makeArroyo({ tick: 5000 }))
    sys.update(1, makeWorld(), em, 90000)
    expect((sys as any).arroyos).toHaveLength(1)
  })

  it('混合：过期删除，新的保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // cutoff = 90000 - 86000 = 4000
    ;(sys as any).arroyos.push(makeArroyo({ tick: 0 }))    // 过期
    ;(sys as any).arroyos.push(makeArroyo({ tick: 5000 })) // 保留
    sys.update(1, makeWorld(), em, 90000)
    expect((sys as any).arroyos).toHaveLength(1)
    expect((sys as any).arroyos[0].tick).toBe(5000)
  })

  it('多个过期 arroyo 全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // cutoff = 90000 - 86000 = 4000
    ;(sys as any).arroyos.push(makeArroyo({ tick: 0 }))
    ;(sys as any).arroyos.push(makeArroyo({ tick: 1000 }))
    ;(sys as any).arroyos.push(makeArroyo({ tick: 3999 }))
    sys.update(1, makeWorld(), em, 90000)
    expect((sys as any).arroyos).toHaveLength(0)
  })

  it('tick 恰好等于 cutoff 边界时保留（a.tick === cutoff 不删除）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // cutoff = 90000 - 86000 = 4000; a.tick=4000 => NOT < cutoff => 保留
    ;(sys as any).arroyos.push(makeArroyo({ tick: 4000 }))
    sys.update(1, makeWorld(), em, 90000)
    expect((sys as any).arroyos).toHaveLength(1)
  })
})
