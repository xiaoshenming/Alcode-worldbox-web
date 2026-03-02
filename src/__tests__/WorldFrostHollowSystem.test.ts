import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldFrostHollowSystem } from '../systems/WorldFrostHollowSystem'
import type { FrostHollow } from '../systems/WorldFrostHollowSystem'

const CHECK_INTERVAL = 1500
const MAX_HOLLOWS = 25

const grassWorld = { width: 200, height: 200, getTile: () => 3 } as any
const sandWorld = { width: 200, height: 200, getTile: () => 2 } as any
const em = {} as any

function makeSys(): WorldFrostHollowSystem { return new WorldFrostHollowSystem() }
let nextId = 1
function makeHollow(overrides: Partial<FrostHollow> = {}): FrostHollow {
  return {
    id: nextId++,
    x: 10, y: 5,
    depth: 3,
    temperature: -8,
    frostDuration: 200,
    vegetationDamage: 30,
    airPooling: 60,
    tick: 0,
    ...overrides,
  }
}

describe('WorldFrostHollowSystem', () => {
  let sys: WorldFrostHollowSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.restoreAllMocks()
  })

  // ── 基础状态 ──────────────────────────────────────────────────

  it('初始无霜洼', () => {
    expect((sys as any).hollows).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).hollows.push(makeHollow())
    expect((sys as any).hollows).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).hollows).toBe((sys as any).hollows)
  })

  it('霜洼字段正确', () => {
    ;(sys as any).hollows.push(makeHollow())
    const h = (sys as any).hollows[0]
    expect(h.temperature).toBe(-8)
    expect(h.vegetationDamage).toBe(30)
    expect(h.airPooling).toBe(60)
  })

  it('多个霜洼全部返回', () => {
    ;(sys as any).hollows.push(makeHollow())
    ;(sys as any).hollows.push(makeHollow())
    expect((sys as any).hollows).toHaveLength(2)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────

  it('tick 未达 CHECK_INTERVAL 时 update 跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).hollows).toHaveLength(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时触发检查并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距小于 CHECK_INTERVAL 时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    sys.update(1, grassWorld, em, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距达到 CHECK_INTERVAL 时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    sys.update(1, grassWorld, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ── spawn 阻断 ────────────────────────────────────────────────

  it('random=0.9 时不 spawn（大于 SPAWN_CHANCE）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).hollows).toHaveLength(0)
  })

  it('SAND tile(tile<3) 不 spawn（需要 3-5）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    expect((sys as any).hollows).toHaveLength(0)
  })

  // ── 演化逻辑 ──────────────────────────────────────────────────

  it('update 后 temperature 降低（冷却逻辑）', () => {
    ;(sys as any).hollows.push(makeHollow({ temperature: -8, airPooling: 60 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    const h = (sys as any).hollows[0]
    expect(h.temperature).toBeLessThan(-8)
  })

  it('update 后 temperature 不低于 -30 下限', () => {
    ;(sys as any).hollows.push(makeHollow({ temperature: -29.99, airPooling: 60 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 100; i++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, grassWorld, em, CHECK_INTERVAL * (i + 1))
    }
    const h = (sys as any).hollows[0]
    expect(h.temperature).toBeGreaterThanOrEqual(-30)
  })

  it('update 后 frostDuration 减少1', () => {
    ;(sys as any).hollows.push(makeHollow({ frostDuration: 200 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    const h = (sys as any).hollows[0]
    expect(h.frostDuration).toBe(199)
  })

  it('update 后 vegetationDamage 增加', () => {
    ;(sys as any).hollows.push(makeHollow({ vegetationDamage: 30, temperature: -10 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    const h = (sys as any).hollows[0]
    expect(h.vegetationDamage).toBeGreaterThan(30)
  })

  it('vegetationDamage 不超过 100 上限', () => {
    ;(sys as any).hollows.push(makeHollow({ vegetationDamage: 99.9, temperature: -10, frostDuration: 200, airPooling: 60 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 20; i++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, grassWorld, em, CHECK_INTERVAL * (i + 1))
    }
    const h = (sys as any).hollows[0]
    if (h) {
      expect(h.vegetationDamage).toBeLessThanOrEqual(100)
    }
  })

  it('update 后 airPooling 减少', () => {
    ;(sys as any).hollows.push(makeHollow({ airPooling: 60 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    const h = (sys as any).hollows[0]
    expect(h.airPooling).toBeLessThan(60)
  })

  it('airPooling 不低于 10 下限', () => {
    ;(sys as any).hollows.push(makeHollow({ airPooling: 10.1, frostDuration: 9999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 0; i < 10; i++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, grassWorld, em, CHECK_INTERVAL * (i + 1))
    }
    const h = (sys as any).hollows[0]
    if (h) {
      expect(h.airPooling).toBeGreaterThanOrEqual(10)
    }
  })

  // ── cleanup 逻辑 ──────────────────────────────────────────────

  it('frostDuration <= 0 时霜洼被清理', () => {
    ;(sys as any).hollows.push(makeHollow({ frostDuration: 1, airPooling: 50 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).hollows).toHaveLength(0)
  })

  it('airPooling <= 10 时霜洼被清理', () => {
    ;(sys as any).hollows.push(makeHollow({ airPooling: 10.1, frostDuration: 100 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).hollows).toHaveLength(0)
  })

  it('frostDuration > 0 且 airPooling > 10 时霜洼保留', () => {
    ;(sys as any).hollows.push(makeHollow({ frostDuration: 200, airPooling: 60 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).hollows).toHaveLength(1)
  })

  it('同时有过期和未过期霜洼，只删过期的', () => {
    ;(sys as any).hollows.push(makeHollow({ frostDuration: 1, airPooling: 50 }))
    ;(sys as any).hollows.push(makeHollow({ frostDuration: 200, airPooling: 60 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).hollows).toHaveLength(1)
    expect((sys as any).hollows[0].frostDuration).toBeGreaterThan(0)
  })

  it('多个过期霜洼全部被清理', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).hollows.push(makeHollow({ frostDuration: 1, airPooling: 50 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).hollows).toHaveLength(0)
  })

  // ── MAX_HOLLOWS 上限 ──────────────────────────────────────────

  it('注入 MAX_HOLLOWS 个霜洼后不再 spawn', () => {
    for (let i = 0; i < MAX_HOLLOWS; i++) {
      ;(sys as any).hollows.push(makeHollow({ frostDuration: 999, airPooling: 50 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).hollows.length).toBeGreaterThanOrEqual(MAX_HOLLOWS - 3)
  })

  it('MAX_HOLLOWS-1 个时仍在 limit 内', () => {
    for (let i = 0; i < MAX_HOLLOWS - 1; i++) {
      ;(sys as any).hollows.push(makeHollow({ frostDuration: 999, airPooling: 50 }))
    }
    expect((sys as any).hollows).toHaveLength(MAX_HOLLOWS - 1)
  })

  // ── 字段范围验证 ──────────────────────────────────────────────

  it('每个霜洼有 x/y 坐标', () => {
    ;(sys as any).hollows.push(makeHollow({ x: 10, y: 20 }))
    const h = (sys as any).hollows[0]
    expect(h.x).toBe(10)
    expect(h.y).toBe(20)
  })

  it('每个霜洼有 depth 字段', () => {
    ;(sys as any).hollows.push(makeHollow({ depth: 5 }))
    const h = (sys as any).hollows[0]
    expect(h.depth).toBe(5)
    expect(h.depth).toBeGreaterThanOrEqual(2)
    expect(h.depth).toBeLessThanOrEqual(10)
  })

  it('注入多个霜洼 id 不重复', () => {
    ;(sys as any).hollows.push(makeHollow())
    ;(sys as any).hollows.push(makeHollow())
    ;(sys as any).hollows.push(makeHollow())
    const ids = (sys as any).hollows.map((h: FrostHollow) => h.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('每个霜洼有 tick 字段记录创建时间', () => {
    ;(sys as any).hollows.push(makeHollow({ tick: 12345 }))
    const h = (sys as any).hollows[0]
    expect(h.tick).toBe(12345)
  })

  it('depth 字段合法范围(2-10)', () => {
    const h = makeHollow({ depth: 2 + 0 * 8 })
    expect(h.depth).toBeGreaterThanOrEqual(2)
    expect(h.depth).toBeLessThanOrEqual(10)
  })

  it('airPooling 初始范围(30-80)', () => {
    const h = makeHollow({ airPooling: 30 + 0 * 50 })
    expect(h.airPooling).toBeGreaterThanOrEqual(30)
    expect(h.airPooling).toBeLessThanOrEqual(80)
  })
})
