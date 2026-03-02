import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureNightWatchSystem } from '../systems/CreatureNightWatchSystem'
import type { WatchShift, NightWatch } from '../systems/CreatureNightWatchSystem'

// CHECK_INTERVAL=900, WATCH_CHANCE=0.03, MAX_WATCHES=70

function makeSys() { return new CreatureNightWatchSystem() }

describe('CreatureNightWatchSystem', () => {
  let sys: CreatureNightWatchSystem

  beforeEach(() => { sys = makeSys() })

  it('初始化不崩溃', () => { expect(sys).toBeDefined() })
  it('内部watches初始为空', () => { expect((sys as any).watches.length).toBe(0) })

  // ── CHECK_INTERVAL 节流 ──────────────────────────────────────────────────

  it('tick差值<CHECK_INTERVAL(900)时不更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 800)  // 800-0=800 < 900
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值>=CHECK_INTERVAL(900)时更新lastCheck', () => {
    const em = { getEntitiesWithComponents: () => [] as number[] } as any
    ;(sys as any).lastCheck = 0
    sys.update(1, em, 900)  // 900-0=900 >= 900
    expect((sys as any).lastCheck).toBe(900)
  })

  // ── pruneOld 截断逻辑 ────────────────────────────────────────────────────

  it('watches数量<=70时不截断', () => {
    const watches = (sys as any).watches as NightWatch[]
    for (let i = 0; i < 70; i++) {
      watches.push({ id: i + 1, sentryId: i, shift: 'midnight', vigilance: 50, threatsSpotted: 0, tick: i })
    }
    ;(sys as any).pruneOld()
    expect(watches.length).toBe(70)
  })

  it('watches数量>70时截断到70', () => {
    const watches = (sys as any).watches as NightWatch[]
    for (let i = 0; i < 78; i++) {
      watches.push({ id: i + 1, sentryId: i, shift: 'dusk', vigilance: 40, threatsSpotted: 1, tick: i })
    }
    ;(sys as any).pruneOld()
    expect(watches.length).toBe(70)
  })

  it('pruneOld保留最新记录（从头部删除）', () => {
    const watches = (sys as any).watches as NightWatch[]
    for (let i = 0; i < 75; i++) {
      watches.push({ id: i + 1, sentryId: i, shift: 'dawn', vigilance: 60, threatsSpotted: 0, tick: i })
    }
    ;(sys as any).pruneOld()
    expect(watches.length).toBe(70)
    expect(watches[0].id).toBe(6)
    expect(watches[69].id).toBe(75)
  })

  // ── getRecent ────────────────────────────────────────────────────────────

  it('getRecent(3)从末尾返回最近3条记录', () => {
    const watches = (sys as any).watches as NightWatch[]
    for (let i = 1; i <= 5; i++) {
      watches.push({ id: i, sentryId: i, shift: 'midnight', vigilance: 50, threatsSpotted: 0, tick: i * 100 })
    }
    const recent = sys.getRecent(3)
    expect(recent.length).toBe(3)
    expect(recent[0].id).toBe(3)
    expect(recent[2].id).toBe(5)
  })

  it('getRecent(1)只返回最后1条', () => {
    const watches = (sys as any).watches as NightWatch[]
    watches.push({ id: 1, sentryId: 1, shift: 'dusk', vigilance: 50, threatsSpotted: 0, tick: 0 })
    watches.push({ id: 2, sentryId: 2, shift: 'dawn', vigilance: 60, threatsSpotted: 1, tick: 100 })
    const recent = sys.getRecent(1)
    expect(recent).toHaveLength(1)
    expect(recent[0].id).toBe(2)
  })

  it('watches数量少于count时getRecent���回全部', () => {
    const watches = (sys as any).watches as NightWatch[]
    watches.push({ id: 1, sentryId: 1, shift: 'dawn', vigilance: 50, threatsSpotted: 0, tick: 100 })
    const recent = sys.getRecent(10)
    expect(recent.length).toBe(1)
  })

  // ── processThreats vigilance 递增 ───────────────────────────────────────

  it('processThreats中vigilance上限100', () => {
    const watches = (sys as any).watches as NightWatch[]
    // 用高vigilance使触发概率高，但手动验证clamp逻辑
    const w: NightWatch = { id: 1, sentryId: 1, shift: 'midnight', vigilance: 99, threatsSpotted: 0, tick: 0 }
    watches.push(w)
    // 多次触发processThreats直到vigilance变化
    for (let i = 0; i < 100; i++) {
      ;(sys as any).processThreats()
    }
    expect(w.vigilance).toBeLessThanOrEqual(100)
  })

  it('WatchShift包含dusk、midnight、dawn三种', () => {
    const shifts: WatchShift[] = ['dusk', 'midnight', 'dawn']
    expect(shifts.length).toBe(3)
    const watches = (sys as any).watches as NightWatch[]
    for (const shift of shifts) {
      watches.push({ id: 1, sentryId: 1, shift, vigilance: 50, threatsSpotted: 0, tick: 0 })
    }
    expect(watches.length).toBe(3)
  })
})
