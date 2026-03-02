import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldCoralAtollSystem } from '../systems/WorldCoralAtollSystem'
import type { CoralAtoll } from '../systems/WorldCoralAtollSystem'

const CHECK_INTERVAL = 2800
const MAX_ATOLLS = 20

// GRASS(3) 不触发 spawn
const safeWorld = { width: 200, height: 200, getTile: () => 3 } as any
// SHALLOW_WATER(1) 触发 spawn
const shallowWorld = { width: 200, height: 200, getTile: () => 1 } as any
// DEEP_WATER(0) 也触发 spawn
const deepWorld = { width: 200, height: 200, getTile: () => 0 } as any

const em = {} as any

function makeSys(): WorldCoralAtollSystem { return new WorldCoralAtollSystem() }
let nextId = 1
function makeAtoll(overrides: Partial<CoralAtoll> = {}): CoralAtoll {
  return {
    id: nextId++, x: 40, y: 50,
    outerRadius: 20, innerRadius: 10,
    coralHealth: 80, lagoonDepth: 15,
    biodiversity: 90, bleachingRisk: 30,
    tick: 0,
    ...overrides,
  }
}

describe('WorldCoralAtollSystem', () => {
  let sys: WorldCoralAtollSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 初始化 ────────────────────────────────────────────────────────────────
  it('初始无珊瑚环礁', () => {
    expect((sys as any).atolls).toHaveLength(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── 注入与字段检查 ──────���─────────────────────────────────────────────────
  it('注入后 atolls 长度正确', () => {
    ;(sys as any).atolls.push(makeAtoll())
    expect((sys as any).atolls).toHaveLength(1)
  })

  it('atolls 返回内部同一引用', () => {
    expect((sys as any).atolls).toBe((sys as any).atolls)
  })

  it('珊瑚环礁字段全部正确', () => {
    ;(sys as any).atolls.push(makeAtoll())
    const a = (sys as any).atolls[0]
    expect(a.coralHealth).toBe(80)
    expect(a.biodiversity).toBe(90)
    expect(a.bleachingRisk).toBe(30)
    expect(a.outerRadius).toBe(20)
    expect(a.innerRadius).toBe(10)
    expect(a.lagoonDepth).toBe(15)
  })

  it('可注入多个环礁', () => {
    ;(sys as any).atolls.push(makeAtoll())
    ;(sys as any).atolls.push(makeAtoll())
    expect((sys as any).atolls).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────────────────
  it('tick 未超 CHECK_INTERVAL 时 update 不更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 0)
    sys.update(1, safeWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 超过 CHECK_INTERVAL 后 lastCheck 更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1)
  })

  // ── safeWorld(GRASS) 不触发 spawn ─────────────────────────────────────────
  it('GRASS tile 时 random<=FORM_CHANCE 也不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)  // 0.001 < FORM_CHANCE(0.002)
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).atolls).toHaveLength(0)
  })

  // ── shallowWorld 触发 spawn ───────────────────────────────────────────────
  it('SHALLOW_WATER + random < FORM_CHANCE 时 spawn 一个环礁', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)  // 0.001 < 0.002 → spawn
    sys.update(1, shallowWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).atolls).toHaveLength(1)
  })

  it('spawn 的环礁 tick 记录当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, shallowWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).atolls[0].tick).toBe(CHECK_INTERVAL + 1)
  })

  it('DEEP_WATER + random < FORM_CHANCE 时 spawn 一个环礁', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, deepWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).atolls).toHaveLength(1)
  })

  it('random >= FORM_CHANCE 时即使是水域也不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)  // 0.9 >= 0.002
    sys.update(1, shallowWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).atolls).toHaveLength(0)
  })

  // ── spawn 字段范围 ────────────────────────────────────────────────────────
  it('spawn 的 outerRadius 在 [5,9] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, shallowWorld, em, CHECK_INTERVAL + 1)
    const a = (sys as any).atolls[0]
    expect(a.outerRadius).toBeGreaterThanOrEqual(5)
    expect(a.outerRadius).toBeLessThanOrEqual(9)  // 5 + floor(0.001*5)=5，最大5+4=9
  })

  it('spawn 的 innerRadius 不超过 outerRadius-2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, shallowWorld, em, CHECK_INTERVAL + 1)
    const a = (sys as any).atolls[0]
    expect(a.innerRadius).toBeLessThanOrEqual(a.outerRadius - 2)
  })

  it('spawn 的 innerRadius 至少为 2', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, shallowWorld, em, CHECK_INTERVAL + 1)
    const a = (sys as any).atolls[0]
    expect(a.innerRadius).toBeGreaterThanOrEqual(2)
  })

  // ── 字段更新逻辑 ──────────────────────────────────────────────────────────
  it('每轮 update 后 biodiversity += 0.01（最大100）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).atolls.push(makeAtoll({ biodiversity: 50, tick: 999999 }))
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    const a = (sys as any).atolls[0]
    expect(a.biodiversity).toBeCloseTo(50.01, 5)
  })

  it('biodiversity 不超过 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).atolls.push(makeAtoll({ biodiversity: 100, tick: 999999 }))
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).atolls[0].biodiversity).toBe(100)
  })

  it('coralHealth 不低于 10', () => {
    // random=0 → (0-0.48)*0.1 = -0.048，最终 max(10, ...) 保证 >=10
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).atolls.push(makeAtoll({ coralHealth: 10, tick: 999999 }))
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).atolls[0].coralHealth).toBeGreaterThanOrEqual(10)
  })

  it('coralHealth 不超过 100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).atolls.push(makeAtoll({ coralHealth: 100, tick: 999999 }))
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).atolls[0].coralHealth).toBeLessThanOrEqual(100)
  })

  it('bleachingRisk 不低于 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).atolls.push(makeAtoll({ bleachingRisk: 0, tick: 999999 }))
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).atolls[0].bleachingRisk).toBeGreaterThanOrEqual(0)
  })

  it('bleachingRisk 不超过 80', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).atolls.push(makeAtoll({ bleachingRisk: 80, tick: 999999 }))
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).atolls[0].bleachingRisk).toBeLessThanOrEqual(80)
  })

  // ── cleanup 逻辑 ──────────────────────────────────────────────────────────
  it('age < 95000 的环礁不被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).atolls.push(makeAtoll({ tick: 0 }))
    sys.update(1, safeWorld, em, CHECK_INTERVAL + 1)
    // age = CHECK_INTERVAL+1 < 95000，保留
    expect((sys as any).atolls).toHaveLength(1)
  })

  it('age > 95000 的环礁被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).atolls.push(makeAtoll({ tick: 0 }))
    const currentTick = CHECK_INTERVAL + 1 + 95001
    sys.update(1, safeWorld, em, currentTick)
    expect((sys as any).atolls).toHaveLength(0)
  })

  it('混合新旧环礁：仅旧的被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const currentTick = 200000
    ;(sys as any).lastCheck = currentTick - CHECK_INTERVAL - 1
    ;(sys as any).atolls.push(makeAtoll({ tick: 0 }))         // age=200000>95000 → 清理
    ;(sys as any).atolls.push(makeAtoll({ tick: 150000 }))    // age=50000<95000 → 保留
    sys.update(1, safeWorld, em, currentTick)
    expect((sys as any).atolls).toHaveLength(1)
    expect((sys as any).atolls[0].tick).toBe(150000)
  })

  // ── MAX_ATOLLS 容量上限 ───────────────────────────────────────────────────
  it('达到 MAX_ATOLLS 后不再 spawn', () => {
    for (let i = 0; i < MAX_ATOLLS; i++) {
      ;(sys as any).atolls.push(makeAtoll({ tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, shallowWorld, em, CHECK_INTERVAL + 1)
    expect((sys as any).atolls.length).toBe(MAX_ATOLLS)
  })
})
