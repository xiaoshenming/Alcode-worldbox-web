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

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // --- CHECK_INTERVAL 节流 ---
  it('tick < CHECK_INTERVAL时不更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick == CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续调用：第二次tick不满足间隔则跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    const lastCheck = (sys as any).lastCheck
    sys.update(1, makeWorld(), em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(lastCheck)
  })

  // --- Spawn 生成逻辑 ---
  it('random > FORM_CHANCE时不生成wells', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).wells).toHaveLength(0)
  })

  it('random < FORM_CHANCE时生成1个well', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).wells).toHaveLength(1)
  })

  it('生成的well字段在合法范围内', () => {
    // mock=0.0005时 spawn后还有一次update：
    // waterPressure = max(10, min(85, (20 + 0.0005*45) + (0.0005-0.48)*0.2)) ≈ 19.93
    // 因此用夹紧后的系统下限10作为断言下限
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    const w = (sys as any).wells[0]
    expect(w.waterPressure).toBeGreaterThanOrEqual(10)
    expect(w.waterPressure).toBeLessThanOrEqual(85)
    expect(w.flowRate).toBeGreaterThanOrEqual(2)
    expect(w.flowRate).toBeLessThanOrEqual(55)
    expect(w.aquiferDepth).toBeGreaterThanOrEqual(10)
    expect(w.aquiferDepth).toBeLessThanOrEqual(50)
    expect(w.waterPurity).toBeGreaterThanOrEqual(15)
    expect(w.waterPurity).toBeLessThanOrEqual(90)
  })

  it('生成的well记录spawn时的tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).wells[0].tick).toBe(CHECK_INTERVAL)
  })

  it('已达MAX_WELLS时不再生成', () => {
    for (let i = 0; i < MAX_WELLS; i++) {
      ;(sys as any).wells.push(makeWell())
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).wells).toHaveLength(MAX_WELLS)
  })

  // --- 字段更新 ---
  it('update后waterPressure保持在[10, 85]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).wells.push(makeWell({ waterPressure: 84 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    const w = (sys as any).wells[0]
    expect(w.waterPressure).toBeGreaterThanOrEqual(10)
    expect(w.waterPressure).toBeLessThanOrEqual(85)
  })

  it('update后flowRate保持在[2, 55]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).wells.push(makeWell({ flowRate: 54 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    const w = (sys as any).wells[0]
    expect(w.flowRate).toBeGreaterThanOrEqual(2)
    expect(w.flowRate).toBeLessThanOrEqual(55)
  })

  it('update后waterPurity保持在[15, 90]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).wells.push(makeWell({ waterPurity: 89 }))
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    const w = (sys as any).wells[0]
    expect(w.waterPurity).toBeGreaterThanOrEqual(15)
    expect(w.waterPurity).toBeLessThanOrEqual(90)
  })

  // --- Cleanup 清理 ---
  it('超过cutoff(tick-86000)的well被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).wells.push(makeWell({ tick: 0 }))
    sys.update(1, makeWorld(), em, 90000)
    expect((sys as any).wells).toHaveLength(0)
  })

  it('未超过cutoff的well保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).wells.push(makeWell({ tick: 50000 }))
    sys.update(1, makeWorld(), em, 90000)
    expect((sys as any).wells).toHaveLength(1)
  })

  it('tick恰好在cutoff边界的well保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const tick = 90000
    const cutoff = tick - 86000  // = 4000
    ;(sys as any).wells.push(makeWell({ tick: cutoff }))
    sys.update(1, makeWorld(), em, tick)
    // wells[i].tick < cutoff => cutoff < cutoff 为false，不删除
    expect((sys as any).wells).toHaveLength(1)
  })

  it('混合tick：旧的被清除，新的保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).wells.push(makeWell({ tick: 0 }))
    ;(sys as any).wells.push(makeWell({ tick: 80000 }))
    sys.update(1, makeWorld(), em, 90000)
    expect((sys as any).wells).toHaveLength(1)
    expect((sys as any).wells[0].tick).toBe(80000)
  })

  // --- 注入验证 ---
  it('直接注入well后字段可访问', () => {
    ;(sys as any).wells.push(makeWell({ waterPressure: 70, aquiferDepth: 100, waterPurity: 90 }))
    const w = (sys as any).wells[0]
    expect(w.waterPressure).toBe(70)
    expect(w.aquiferDepth).toBe(100)
    expect(w.waterPurity).toBe(90)
  })

  it('多个wells全部返回', () => {
    ;(sys as any).wells.push(makeWell())
    ;(sys as any).wells.push(makeWell())
    expect((sys as any).wells).toHaveLength(2)
  })

  it('nextId在spawn后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0005)
    sys.update(1, makeWorld(), em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })
})
