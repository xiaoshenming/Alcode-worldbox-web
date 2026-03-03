import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldArtesianWellSystem } from '../systems/WorldArtesianWellSystem'
import type { ArtesianWell } from '../systems/WorldArtesianWellSystem'

const CHECK_INTERVAL = 3040
const MAX_WELLS = 12
const FORM_CHANCE = 0.0012

let nextId = 1
function makeSys() { return new WorldArtesianWellSystem() }
function makeWell(overrides: Partial<ArtesianWell> = {}): ArtesianWell {
  return {
    id: nextId++,
    x: 50, y: 50,
    waterPressure: 40,
    flowRate: 15,
    aquiferDepth: 25,
    waterPurity: 50,
    tick: 0,
    ...overrides,
  }
}
const makeWorld = () => ({ width: 200, height: 200 }) as any
const em = {} as any

describe('WorldArtesianWellSystem', () => {
  let sys: WorldArtesianWellSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // --- 初始状态 ---
  it('初始wells为空', () => {
    expect((sys as any).wells).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('wells是数组', () => {
    expect(Array.isArray((sys as any).wells)).toBe(true)
  })
  it('新建两个实例互相独立', () => {
    const s1 = makeSys(); const s2 = makeSys()
    ;(s1 as any).wells.push(makeWell())
    expect((s2 as any).wells).toHaveLength(0)
  })

  // --- CHECK_INTERVAL节流 ---
  it('tick < CHECK_INTERVAL时不触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick >= CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('第二次间隔不足时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('间隔足够时第二次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // --- spawn ---
  it('random > FORM_CHANCE时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).wells).toHaveLength(0)
  })
  it('random < FORM_CHANCE时spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).wells).toHaveLength(1)
  })
  it('MAX_WELLS(12)上限不超出', () => {
    for (let i = 0; i < MAX_WELLS; i++) {
      ;(sys as any).wells.push(makeWell({ tick: 99999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).wells.length).toBeLessThanOrEqual(MAX_WELLS)
  })
  it('spawn后well有id字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    const w = (sys as any).wells[0]
    if (w) expect(typeof w.id).toBe('number')
  })
  it('spawn后well tick等于当前tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    const w = (sys as any).wells[0]
    if (w) expect(w.tick).toBe(CHECK_INTERVAL)
  })
  it('spawn后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    if ((sys as any).wells.length > 0) {
      expect((sys as any).nextId).toBeGreaterThan(1)
    }
  })
  it('spawn后well包含waterPressure字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    const w = (sys as any).wells[0]
    if (w) expect(typeof w.waterPressure).toBe('number')
  })
  it('spawn后well包含aquiferDepth字段', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    const w = (sys as any).wells[0]
    if (w) expect(typeof w.aquiferDepth).toBe('number')
  })

  // --- 字段更新 ---
  it('waterPressure每次update变化', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).wells.push(makeWell({ waterPressure: 40, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    // waterPressure = max(10, min(85, 40 + (0.9-0.48)*0.2)) = max(10, min(85, 40.084)) = 40.084
    expect((sys as any).wells[0].waterPressure).toBeCloseTo(40.084, 4)
  })
  it('waterPressure不低于10', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).wells.push(makeWell({ waterPressure: 10, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).wells[0].waterPressure).toBeGreaterThanOrEqual(10)
  })
  it('waterPressure不高于85', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    ;(sys as any).wells.push(makeWell({ waterPressure: 85, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).wells[0].waterPressure).toBeLessThanOrEqual(85)
  })
  it('flowRate不低于2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).wells.push(makeWell({ flowRate: 2, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).wells[0].flowRate).toBeGreaterThanOrEqual(2)
  })
  it('flowRate不高于55', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    ;(sys as any).wells.push(makeWell({ flowRate: 55, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).wells[0].flowRate).toBeLessThanOrEqual(55)
  })
  it('waterPurity不低于15', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    ;(sys as any).wells.push(makeWell({ waterPurity: 15, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).wells[0].waterPurity).toBeGreaterThanOrEqual(15)
  })
  it('waterPurity不高于90', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1.0)
    ;(sys as any).wells.push(makeWell({ waterPurity: 90, tick: 99999 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).wells[0].waterPurity).toBeLessThanOrEqual(90)
  })
  it('多个wells同时更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 3; i++) {
      ;(sys as any).wells.push(makeWell({ waterPressure: 40, tick: 99999 }))
    }
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    for (const w of (sys as any).wells) {
      expect(w.waterPressure).toBeGreaterThan(40)
    }
  })

  // --- cleanup ---
  it('tick < cutoff(tick-86000)时被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).wells.push(makeWell({ tick: 0 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).wells).toHaveLength(0)
  })
  it('tick >= cutoff时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).wells.push(makeWell({ tick: 50000 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).wells).toHaveLength(1)
  })
  it('cutoff边界时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bigTick = 100000; const cutoff = bigTick - 86000
    ;(sys as any).wells.push(makeWell({ tick: cutoff }))
    sys.update(1, makeWorld(), em, bigTick)
    expect((sys as any).wells).toHaveLength(1)
  })
  it('混合新旧：只删过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).wells.push(makeWell({ tick: 0 }))
    ;(sys as any).wells.push(makeWell({ tick: 50000 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).wells).toHaveLength(1)
    expect((sys as any).wells[0].tick).toBe(50000)
  })
  it('所有wells过期时全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 5; i++) (sys as any).wells.push(makeWell({ tick: 0 }))
    sys.update(1, makeWorld(), em, 100000)
    expect((sys as any).wells).toHaveLength(0)
  })

  // --- 手动注入 ---
  it('手动注入后长度正确', () => {
    ;(sys as any).wells.push(makeWell())
    expect((sys as any).wells).toHaveLength(1)
  })
  it('手动注入多个', () => {
    for (let i = 0; i < 5; i++) (sys as any).wells.push(makeWell())
    expect((sys as any).wells).toHaveLength(5)
  })
  it('注入well的字段可读取', () => {
    ;(sys as any).wells.push(makeWell({ waterPressure: 99 }))
    expect((sys as any).wells[0].waterPressure).toBe(99)
  })

  // --- 边界条件 ---
  it('tick=0不触发', () => {
    sys.update(1, makeWorld(), em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('大tick值不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorld(), em, 9999999)).not.toThrow()
  })
  it('wells为空时update不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, makeWorld(), em, CHECK_INTERVAL)).not.toThrow()
  })
  it('well字段结构完整', () => {
    const w = makeWell()
    expect(typeof w.id).toBe('number')
    expect(typeof w.x).toBe('number')
    expect(typeof w.y).toBe('number')
    expect(typeof w.waterPressure).toBe('number')
    expect(typeof w.flowRate).toBe('number')
    expect(typeof w.aquiferDepth).toBe('number')
    expect(typeof w.waterPurity).toBe('number')
    expect(typeof w.tick).toBe('number')
  })
})
