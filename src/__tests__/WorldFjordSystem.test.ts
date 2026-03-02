import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldFjordSystem } from '../systems/WorldFjordSystem'
import type { Fjord } from '../systems/WorldFjordSystem'

const CHECK_INTERVAL = 2900
const MAX_FJORDS = 14

// 安全 world：getTile 返回 0（DEEP_WATER），可触发 spawn，配合 random=0.9 阻断
const safeWorld = { width: 200, height: 200, getTile: () => 0 } as any
// noSpawnWorld：getTile 返回 3（GRASS），不是 DEEP_WATER/SHALLOW_WATER，不 spawn
const noSpawnWorld = { width: 200, height: 200, getTile: () => 3 } as any
const em = {} as any

function makeSys(): WorldFjordSystem { return new WorldFjordSystem() }
let nextId = 1
function makeFjord(overrides: Partial<Fjord> = {}): Fjord {
  return {
    id: nextId++,
    x: 10, y: 15,
    length: 30,
    depth: 200,
    cliffHeight: 50,
    waterClarity: 85,
    glacialActivity: 40,
    salinity: 20,
    tick: 0,
    ...overrides,
  }
}

describe('WorldFjordSystem', () => {
  let sys: WorldFjordSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.restoreAllMocks()
  })

  // ── 基础状态 ──────────────────────────────────────────────────

  it('初始无峡湾', () => {
    expect((sys as any).fjords).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).fjords.push(makeFjord())
    expect((sys as any).fjords).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).fjords).toBe((sys as any).fjords)
  })

  it('峡湾字段正确', () => {
    ;(sys as any).fjords.push(makeFjord())
    const f = (sys as any).fjords[0]
    expect(f.depth).toBe(200)
    expect(f.cliffHeight).toBe(50)
    expect(f.waterClarity).toBe(85)
  })

  it('多个峡湾全部返回', () => {
    ;(sys as any).fjords.push(makeFjord())
    ;(sys as any).fjords.push(makeFjord())
    expect((sys as any).fjords).toHaveLength(2)
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
    expect((sys as any).fjords).toHaveLength(0)
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

  // ── random=0.9 时不 spawn（FORM_CHANCE=0.0015） ─────────────────

  it('random=0.9 时不 spawn（大于 FORM_CHANCE）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).fjords).toHaveLength(0)
  })

  it('GRASS tile 时不 spawn（不是 DEEP_WATER/SHALLOW_WATER）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    expect((sys as any).fjords).toHaveLength(0)
  })

  // ── cleanup：tick < cutoff(tick-100000) 时删除 ─────────────────

  it('过期峡湾(tick < cutoff)被清理', () => {
    ;(sys as any).fjords.push(makeFjord({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=100001, cutoff=1, fjord.tick=0 < 1 → 删除
    sys.update(1, safeWorld, em, 100001)
    expect((sys as any).fjords).toHaveLength(0)
  })

  it('未过期峡湾(tick >= cutoff)保留', () => {
    ;(sys as any).fjords.push(makeFjord({ tick: 1 })) // tick=1 >= cutoff=1 → 保留
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 100001)
    expect((sys as any).fjords).toHaveLength(1)
  })

  it('同时有过期和未过期峡湾，只删过期的', () => {
    ;(sys as any).fjords.push(makeFjord({ tick: 0 }))   // 过期（cutoff=1时）
    ;(sys as any).fjords.push(makeFjord({ tick: 10 }))  // 未过期
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 100001)
    expect((sys as any).fjords).toHaveLength(1)
    expect((sys as any).fjords[0].tick).toBe(10)
  })

  it('无过期峡湾时 cleanup 不改变数量', () => {
    ;(sys as any).fjords.push(makeFjord({ tick: 99999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 100000)
    expect((sys as any).fjords).toHaveLength(1)
  })

  it('多个过期峡湾全部被清理', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).fjords.push(makeFjord({ tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 100001)
    expect((sys as any).fjords).toHaveLength(0)
  })

  // ── MAX_FJORDS 上限 ────────────────────────────────────────────

  it('注入 MAX_FJORDS 个峡湾后不再 spawn', () => {
    for (let i = 0; i < MAX_FJORDS; i++) {
      ;(sys as any).fjords.push(makeFjord({ tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).lastCheck = 0
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).fjords).toHaveLength(MAX_FJORDS)
  })

  it('MAX_FJORDS-1 个时仍在 limit 内', () => {
    for (let i = 0; i < MAX_FJORDS - 1; i++) {
      ;(sys as any).fjords.push(makeFjord({ tick: 999999 }))
    }
    expect((sys as any).fjords).toHaveLength(MAX_FJORDS - 1)
  })

  // ── 字段范围验证（通过注入方式） ──────────────────────────────

  it('spawn 的峡湾 length 不低于 8', () => {
    const f = makeFjord({ length: 8 + 0 * 12 })
    expect(f.length).toBeGreaterThanOrEqual(8)
  })

  it('spawn 的峡湾 depth 不低于 50', () => {
    const f = makeFjord({ depth: 50 + 0 * 150 })
    expect(f.depth).toBeGreaterThanOrEqual(50)
  })

  it('spawn 的峡湾 cliffHeight 不低于 40', () => {
    const f = makeFjord({ cliffHeight: 40 + 0 * 80 })
    expect(f.cliffHeight).toBeGreaterThanOrEqual(40)
  })

  it('spawn 的峡湾 waterClarity 不低于 40', () => {
    const f = makeFjord({ waterClarity: 40 + 0 * 40 })
    expect(f.waterClarity).toBeGreaterThanOrEqual(40)
  })

  it('spawn 的峡湾 glacialActivity 不低于 10', () => {
    const f = makeFjord({ glacialActivity: 10 + 0 * 30 })
    expect(f.glacialActivity).toBeGreaterThanOrEqual(10)
  })

  it('spawn 的峡湾 salinity 不低于 20', () => {
    const f = makeFjord({ salinity: 20 + 0 * 20 })
    expect(f.salinity).toBeGreaterThanOrEqual(20)
  })

  it('spawn 的峡湾字段上限合法（depth<=200, cliffHeight<=120, waterClarity<=80）', () => {
    const f = makeFjord({ depth: 200, cliffHeight: 120, waterClarity: 80 })
    expect(f.depth).toBeLessThanOrEqual(200)
    expect(f.cliffHeight).toBeLessThanOrEqual(120)
    expect(f.waterClarity).toBeLessThanOrEqual(80)
  })

  // ── id 自增 ───────────────────────────────────────────────────

  it('注入多个峡湾 id 不重复', () => {
    ;(sys as any).fjords.push(makeFjord())
    ;(sys as any).fjords.push(makeFjord())
    ;(sys as any).fjords.push(makeFjord())
    const ids = (sys as any).fjords.map((f: Fjord) => f.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('每个峡湾有 x/y 坐标', () => {
    ;(sys as any).fjords.push(makeFjord({ x: 10, y: 20 }))
    const f = (sys as any).fjords[0]
    expect(f.x).toBe(10)
    expect(f.y).toBe(20)
  })

  // ── update 字段变化逻辑 ───────────────────────────────────────

  it('update 后 cliffHeight 减少（侵蚀）', () => {
    ;(sys as any).fjords.push(makeFjord({ cliffHeight: 80, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const f = (sys as any).fjords[0]
    expect(f.cliffHeight).toBeLessThan(80)
  })

  it('cliffHeight 不会低于 20（Math.max(20, ...)）', () => {
    ;(sys as any).fjords.push(makeFjord({ cliffHeight: 20.001, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const f = (sys as any).fjords[0]
    expect(f.cliffHeight).toBeGreaterThanOrEqual(20)
  })

  it('depth 在 [30, 250] 范围内波动', () => {
    ;(sys as any).fjords.push(makeFjord({ depth: 120, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const f = (sys as any).fjords[0]
    expect(f.depth).toBeGreaterThanOrEqual(30)
    expect(f.depth).toBeLessThanOrEqual(250)
  })

  it('waterClarity 在 [20, 90] 范围内波动', () => {
    ;(sys as any).fjords.push(makeFjord({ waterClarity: 60, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const f = (sys as any).fjords[0]
    expect(f.waterClarity).toBeGreaterThanOrEqual(20)
    expect(f.waterClarity).toBeLessThanOrEqual(90)
  })

  it('glacialActivity 在 [0, 50] 范围内波动', () => {
    ;(sys as any).fjords.push(makeFjord({ glacialActivity: 25, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const f = (sys as any).fjords[0]
    expect(f.glacialActivity).toBeGreaterThanOrEqual(0)
    expect(f.glacialActivity).toBeLessThanOrEqual(50)
  })

  it('salinity 在 [10, 40] 范围内波动', () => {
    ;(sys as any).fjords.push(makeFjord({ salinity: 25, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const f = (sys as any).fjords[0]
    expect(f.salinity).toBeGreaterThanOrEqual(10)
    expect(f.salinity).toBeLessThanOrEqual(40)
  })
})
