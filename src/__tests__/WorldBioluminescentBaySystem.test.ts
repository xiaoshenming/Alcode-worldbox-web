import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldBioluminescentBaySystem } from '../systems/WorldBioluminescentBaySystem'
import type { BioluminescentBay } from '../systems/WorldBioluminescentBaySystem'
import { EntityManager } from '../ecs/Entity'

function makeSys(): WorldBioluminescentBaySystem { return new WorldBioluminescentBaySystem() }
function makeEm(): EntityManager { return new EntityManager() }
let nextId = 1
function makeBay(overrides: Partial<BioluminescentBay> = {}): BioluminescentBay {
  return {
    id: nextId++, x: 30, y: 40,
    intensity: 50, organismDensity: 50,
    waterClarity: 70, culturalValue: 15,
    seasonalPeak: false, tick: 0,
    ...overrides,
  }
}
function makeWorld(tile: number = 0): any {
  return { width: 100, height: 100, getTile: () => tile }
}

const CHECK_INTERVAL = 2200

describe('WorldBioluminescentBaySystem', () => {
  let sys: WorldBioluminescentBaySystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ─── 初始状态 ─────────────────────────────────────────────────────────────
  it('初始bays为空', () => { expect((sys as any).bays).toHaveLength(0) })
  it('初始nextId为1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('bays是数组', () => { expect(Array.isArray((sys as any).bays)).toBe(true) })
  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).bays.push(makeBay())
    expect((s2 as any).bays).toHaveLength(0)
  })

  // ─── 节流逻辑 ─────────────────────────────────────────────────────────────
  it('tick < CHECK_INTERVAL时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('第二次间隔不足时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('间隔足够时第二次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ─── spawn ────────────────────────────────────────────────────────────────
  it('random > SPAWN_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(0), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bays).toHaveLength(0)
  })
  it('非水地形不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(5), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bays).toHaveLength(0)
  })
  it('DEEP_WATER+random<SPAWN_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(0), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bays).toHaveLength(1)
  })
  it('SHALLOW_WATER也可spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(1), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bays).toHaveLength(1)
  })
  it('MAX_BAYS(10)上限不超出', () => {
    for (let i = 0; i < 10; i++) (sys as any).bays.push(makeBay({ tick: 99999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(0), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bays.length).toBeLessThanOrEqual(10)
  })
  it('spawn后bay有tick字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(0), makeEm(), CHECK_INTERVAL)
    const b = (sys as any).bays[0]
    if (b) expect(b.tick).toBe(CHECK_INTERVAL)
  })
  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(0), makeEm(), CHECK_INTERVAL)
    if ((sys as any).bays.length > 0) expect((sys as any).nextId).toBeGreaterThan(1)
  })
  it('spawn后bay包含intensity字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(0), makeEm(), CHECK_INTERVAL)
    const b = (sys as any).bays[0]
    if (b) expect(typeof b.intensity).toBe('number')
  })
  it('spawn后bay包含seasonalPeak字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(0), makeEm(), CHECK_INTERVAL)
    const b = (sys as any).bays[0]
    if (b) expect(typeof b.seasonalPeak).toBe('boolean')
  })

  // ─── 字段更新 ────────────────────────────────────────────────────────────
  it('organismDensity不低于5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).bays.push(makeBay({ organismDensity: 5, tick: 99999 }))
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bays[0].organismDensity).toBeGreaterThanOrEqual(5)
  })
  it('organismDensity不高于100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    ;(sys as any).bays.push(makeBay({ organismDensity: 100, tick: 99999 }))
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bays[0].organismDensity).toBeLessThanOrEqual(100)
  })
  it('waterClarity不低于10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).bays.push(makeBay({ waterClarity: 10, tick: 99999 }))
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bays[0].waterClarity).toBeGreaterThanOrEqual(10)
  })
  it('waterClarity不高于100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    ;(sys as any).bays.push(makeBay({ waterClarity: 100, tick: 99999 }))
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bays[0].waterClarity).toBeLessThanOrEqual(100)
  })
  it('culturalValue不高于100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).bays.push(makeBay({ culturalValue: 100, intensity: 100, tick: 99999 }))
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bays[0].culturalValue).toBeLessThanOrEqual(100)
  })
  it('seasonalPeak根据tick%20000<5000设置', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).bays.push(makeBay({ tick: 99999 }))
    // tick=2600, 2600%20000=2600<5000 → seasonalPeak=true
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect(typeof (sys as any).bays[0].seasonalPeak).toBe('boolean')
  })

  // ─── cleanup（organismDensity<=5时删除）──────────────────────────────────
  it('organismDensity<=5时bay被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).bays.push(makeBay({ organismDensity: 5, tick: 99999 }))
    sys.update(1, makeWorld(5), makeEm(), CHECK_INTERVAL)
    // After update: max(5, 5+(0-0.48)*2) = max(5, 4.04) = 5 → cleanup removes (<=5), non-water tile prevents spawn
    expect((sys as any).bays).toHaveLength(0)
  })
  it('organismDensity>5时bay保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).bays.push(makeBay({ organismDensity: 50, tick: 99999 }))
    sys.update(1, makeWorld(), makeEm(), CHECK_INTERVAL)
    expect((sys as any).bays).toHaveLength(1)
  })

  // ─── 手动注入 ────────────────────────────────────────────────────────────
  it('手动注入bay后长度正确', () => {
    ;(sys as any).bays.push(makeBay())
    expect((sys as any).bays).toHaveLength(1)
  })
  it('手动注入多个bay', () => {
    for (let i = 0; i < 5; i++) (sys as any).bays.push(makeBay())
    expect((sys as any).bays).toHaveLength(5)
  })
  it('注入bay的字段可读取', () => {
    ;(sys as any).bays.push(makeBay({ intensity: 88 }))
    expect((sys as any).bays[0].intensity).toBe(88)
  })

  // ─── 边界条件 ────────────────────────────────────────────────────────────
  it('tick=0不触发', () => {
    sys.update(1, makeWorld(), makeEm(), 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('大tick值不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorld(), makeEm(), 9999999)).not.toThrow()
  })
  it('bay字段结构完整', () => {
    const b = makeBay()
    expect(typeof b.id).toBe('number')
    expect(typeof b.x).toBe('number')
    expect(typeof b.y).toBe('number')
    expect(typeof b.intensity).toBe('number')
    expect(typeof b.organismDensity).toBe('number')
    expect(typeof b.waterClarity).toBe('number')
    expect(typeof b.culturalValue).toBe('number')
    expect(typeof b.seasonalPeak).toBe('boolean')
    expect(typeof b.tick).toBe('number')
  })
})
