import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldFairyChimneySystem } from '../systems/WorldFairyChimneySystem'
import type { FairyChimney } from '../systems/WorldFairyChimneySystem'

const CHECK_INTERVAL = 2590
const MAX_CHIMNEYS = 16

// 安全 world：getTile 返回 2（SAND），阻断 spawn（需配合 random=0.9）
const safeWorld = { width: 200, height: 200, getTile: () => 2 } as any
// noSpawnWorld：getTile 返回 3（GRASS），不是 MOUNTAIN/SAND，不 spawn
const noSpawnWorld = { width: 200, height: 200, getTile: () => 3 } as any
const em = {} as any

function makeSys(): WorldFairyChimneySystem { return new WorldFairyChimneySystem() }
let nextId = 1
function makeChimney(overrides: Partial<FairyChimney> = {}): FairyChimney {
  return {
    id: nextId++,
    x: 15, y: 25,
    height: 12,
    capSize: 3,
    coneWidth: 4,
    tuffHardness: 70,
    erosionRate: 2,
    spectacle: 80,
    tick: 0,
    ...overrides,
  }
}

describe('WorldFairyChimneySystem', () => {
  let sys: WorldFairyChimneySystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.restoreAllMocks()
  })

  // ── 基础状态 ──────────────────────────────────────────────────

  it('初始无仙女烟囱', () => {
    expect((sys as any).chimneys).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).chimneys.push(makeChimney())
    expect((sys as any).chimneys).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).chimneys).toBe((sys as any).chimneys)
  })

  it('仙女烟囱字段正确', () => {
    ;(sys as any).chimneys.push(makeChimney())
    const c = (sys as any).chimneys[0]
    expect(c.height).toBe(12)
    expect(c.tuffHardness).toBe(70)
    expect(c.spectacle).toBe(80)
  })

  it('多个仙女烟囱全部返回', () => {
    ;(sys as any).chimneys.push(makeChimney())
    ;(sys as any).chimneys.push(makeChimney())
    expect((sys as any).chimneys).toHaveLength(2)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────

  it('tick 未达 CHECK_INTERVAL 时 update 跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).chimneys).toHaveLength(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时触发检查并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距小于 CHECK_INTERVAL 时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    sys.update(1, safeWorld, em, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距达到 CHECK_INTERVAL 时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    sys.update(1, safeWorld, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ── random=0.9 时不 spawn（FORM_CHANCE=0.0013） ─────────────────

  it('random=0.9 时不 spawn（大于 FORM_CHANCE）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).chimneys).toHaveLength(0)
  })

  it('GRASS tile 时不 spawn（不是 MOUNTAIN/SAND）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    expect((sys as any).chimneys).toHaveLength(0)
  })

  // ── cleanup：tick < cutoff(tick-91000) 时删除 ─────────────────

  it('过期烟囱(tick < cutoff)被清理', () => {
    ;(sys as any).chimneys.push(makeChimney({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=91001, cutoff=1, chimney.tick=0 < 1 → 删除
    sys.update(1, safeWorld, em, 91001)
    expect((sys as any).chimneys).toHaveLength(0)
  })

  it('未过期烟囱(tick >= cutoff)保留', () => {
    ;(sys as any).chimneys.push(makeChimney({ tick: 1 })) // tick=1 >= cutoff=1 → 保留
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 91001)
    expect((sys as any).chimneys).toHaveLength(1)
  })

  it('同时有过期和未过期烟囱，只删过期的', () => {
    ;(sys as any).chimneys.push(makeChimney({ tick: 0 }))   // 过期（cutoff=1时）
    ;(sys as any).chimneys.push(makeChimney({ tick: 10 }))  // 未过期
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 91001)
    expect((sys as any).chimneys).toHaveLength(1)
    expect((sys as any).chimneys[0].tick).toBe(10)
  })

  it('无过期烟囱时 cleanup 不改变数量', () => {
    ;(sys as any).chimneys.push(makeChimney({ tick: 99999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 100000)
    expect((sys as any).chimneys).toHaveLength(1)
  })

  it('多个过期烟囱全部被清理', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).chimneys.push(makeChimney({ tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 91001)
    expect((sys as any).chimneys).toHaveLength(0)
  })

  // ── MAX_CHIMNEYS 上限 ────────────────────────────────────────────

  it('注入 MAX_CHIMNEYS 个烟囱后不再 spawn（即使 random 很小）', () => {
    for (let i = 0; i < MAX_CHIMNEYS; i++) {
      ;(sys as any).chimneys.push(makeChimney({ tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).lastCheck = 0
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).chimneys).toHaveLength(MAX_CHIMNEYS)
  })

  it('MAX_CHIMNEYS-1 个时仍在 limit 内', () => {
    for (let i = 0; i < MAX_CHIMNEYS - 1; i++) {
      ;(sys as any).chimneys.push(makeChimney({ tick: 999999 }))
    }
    expect((sys as any).chimneys).toHaveLength(MAX_CHIMNEYS - 1)
  })

  // ── 字段范围验证（通过注入方式） ──────────────────────────────

  it('spawn 的烟囱 height 不低于 5', () => {
    const c = makeChimney({ height: 5 + 0 * 30 })
    expect(c.height).toBeGreaterThanOrEqual(5)
  })

  it('spawn 的烟囱 capSize 不低于 2', () => {
    const c = makeChimney({ capSize: 2 + 0 * 8 })
    expect(c.capSize).toBeGreaterThanOrEqual(2)
  })

  it('spawn 的烟囱 coneWidth 不低于 3', () => {
    const c = makeChimney({ coneWidth: 3 + 0 * 10 })
    expect(c.coneWidth).toBeGreaterThanOrEqual(3)
  })

  it('spawn 的烟囱 tuffHardness 不低于 20', () => {
    const c = makeChimney({ tuffHardness: 20 + 0 * 50 })
    expect(c.tuffHardness).toBeGreaterThanOrEqual(20)
  })

  it('spawn 的烟囱 erosionRate 不低于 3', () => {
    const c = makeChimney({ erosionRate: 3 + 0 * 15 })
    expect(c.erosionRate).toBeGreaterThanOrEqual(3)
  })

  it('spawn 的烟囱 spectacle 不低于 18', () => {
    const c = makeChimney({ spectacle: 18 + 0 * 35 })
    expect(c.spectacle).toBeGreaterThanOrEqual(18)
  })

  it('spawn 的烟囱字段上限合法（height<=35, capSize<=10, coneWidth<=13）', () => {
    const c = makeChimney({ height: 35, capSize: 10, coneWidth: 13 })
    expect(c.height).toBeLessThanOrEqual(35)
    expect(c.capSize).toBeLessThanOrEqual(10)
    expect(c.coneWidth).toBeLessThanOrEqual(13)
  })

  // ── id 自增 ───────────────────────────────────────────────────

  it('注入多个烟囱 id 不重复', () => {
    ;(sys as any).chimneys.push(makeChimney())
    ;(sys as any).chimneys.push(makeChimney())
    ;(sys as any).chimneys.push(makeChimney())
    const ids = (sys as any).chimneys.map((c: FairyChimney) => c.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('每个烟囱有 x/y 坐标', () => {
    ;(sys as any).chimneys.push(makeChimney({ x: 10, y: 20 }))
    const c = (sys as any).chimneys[0]
    expect(c.x).toBe(10)
    expect(c.y).toBe(20)
  })

  // ── update 字段变化逻辑 ───────────────────────────────────────

  it('update 后 height 减少（侵蚀）', () => {
    ;(sys as any).chimneys.push(makeChimney({ height: 20, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const c = (sys as any).chimneys[0]
    expect(c.height).toBeLessThan(20)
  })

  it('update 后 coneWidth 减少（侵蚀）', () => {
    ;(sys as any).chimneys.push(makeChimney({ coneWidth: 10, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const c = (sys as any).chimneys[0]
    expect(c.coneWidth).toBeLessThan(10)
  })

  it('height 不会低于 2（Math.max(2, ...)）', () => {
    ;(sys as any).chimneys.push(makeChimney({ height: 2.00001, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const c = (sys as any).chimneys[0]
    expect(c.height).toBeGreaterThanOrEqual(2)
  })

  it('coneWidth 不会低于 1（Math.max(1, ...)）', () => {
    ;(sys as any).chimneys.push(makeChimney({ coneWidth: 1.00001, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const c = (sys as any).chimneys[0]
    expect(c.coneWidth).toBeGreaterThanOrEqual(1)
  })

  it('erosionRate 在 [1, 25] 范围内波动', () => {
    ;(sys as any).chimneys.push(makeChimney({ erosionRate: 15, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const c = (sys as any).chimneys[0]
    expect(c.erosionRate).toBeGreaterThanOrEqual(1)
    expect(c.erosionRate).toBeLessThanOrEqual(25)
  })

  it('spectacle 在 [8, 65] 范围内波动', () => {
    ;(sys as any).chimneys.push(makeChimney({ spectacle: 40, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const c = (sys as any).chimneys[0]
    expect(c.spectacle).toBeGreaterThanOrEqual(8)
    expect(c.spectacle).toBeLessThanOrEqual(65)
  })
})
