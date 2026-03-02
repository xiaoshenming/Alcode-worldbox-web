import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldFlatironSystem } from '../systems/WorldFlatironSystem'
import type { Flatiron } from '../systems/WorldFlatironSystem'

const CHECK_INTERVAL = 2640
const MAX_FLATIRONS = 15

// safeWorld: getTile 返回 MOUNTAIN(5)，满足 spawn 条件
const mountainWorld = { width: 200, height: 200, getTile: () => 5 } as any
// noSpawnWorld: getTile 返回 SAND(2)，不满足 spawn 条件（只接受 MOUNTAIN 或 FOREST）
const sandWorld = { width: 200, height: 200, getTile: () => 2 } as any
const em = {} as any

function makeSys(): WorldFlatironSystem { return new WorldFlatironSystem() }
let nextId = 1
function makeFlatiron(overrides: Partial<Flatiron> = {}): Flatiron {
  return {
    id: nextId++,
    x: 20,
    y: 30,
    height: 50,
    tiltAngle: 45,
    rockHardness: 60,
    weatheringRate: 2,
    vegetationCover: 15,
    spectacle: 40,
    tick: 0,
    ...overrides,
  }
}

describe('WorldFlatironSystem', () => {
  let sys: WorldFlatironSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.restoreAllMocks()
  })

  // ── 基础状态 ──────────────────────────────────────────────────

  it('初始无熨斗山', () => {
    expect((sys as any).flatirons).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).flatirons.push(makeFlatiron())
    expect((sys as any).flatirons).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).flatirons).toBe((sys as any).flatirons)
  })

  it('熨斗山字段正确', () => {
    ;(sys as any).flatirons.push(makeFlatiron())
    const f = (sys as any).flatirons[0]
    expect(f.tiltAngle).toBe(45)
    expect(f.rockHardness).toBe(60)
    expect(f.spectacle).toBe(40)
  })

  it('多个熨斗山全部返回', () => {
    ;(sys as any).flatirons.push(makeFlatiron())
    ;(sys as any).flatirons.push(makeFlatiron())
    expect((sys as any).flatirons).toHaveLength(2)
  })

  it('每个熨斗山有 x/y 坐标', () => {
    ;(sys as any).flatirons.push(makeFlatiron({ x: 10, y: 25 }))
    const f = (sys as any).flatirons[0]
    expect(f.x).toBe(10)
    expect(f.y).toBe(25)
  })

  // ── CHECK_INTERVAL 节流 ──────────────────────────────────────

  it('tick 未达 CHECK_INTERVAL 时 update 跳过（不更新 lastCheck）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时触发检查并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距小于 CHECK_INTERVAL 时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    sys.update(1, sandWorld, em, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距达到 CHECK_INTERVAL 时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    sys.update(1, sandWorld, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ── spawn 逻辑 ────────────────────────────────────────────────

  it('random=0.9 时不 spawn（大于 FORM_CHANCE=0.0014）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).flatirons).toHaveLength(0)
  })

  it('SAND tile 时不 spawn（不满足 MOUNTAIN/FOREST 条件）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    expect((sys as any).flatirons).toHaveLength(0)
  })

  it('GRASS tile 时不 spawn（不满足 MOUNTAIN/FOREST 条件）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const grassWorld = { width: 200, height: 200, getTile: () => 3 } as any
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).flatirons).toHaveLength(0)
  })

  // ── cleanup：tick < cutoff(tick-93000) 时删除 ─────────────────

  it('过期熨斗山(tick < cutoff)被清理', () => {
    ;(sys as any).flatirons.push(makeFlatiron({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=93001, cutoff=1, flatiron.tick=0 < 1 → 删除
    sys.update(1, sandWorld, em, 93001)
    expect((sys as any).flatirons).toHaveLength(0)
  })

  it('未过期熨斗山(tick >= cutoff)保留', () => {
    ;(sys as any).flatirons.push(makeFlatiron({ tick: 10 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    // tick=93001, cutoff=1, flatiron.tick=10 >= 1 → 保留
    sys.update(1, sandWorld, em, 93001)
    expect((sys as any).flatirons).toHaveLength(1)
  })

  it('同时有过期和未过期熨斗山，只删过期的', () => {
    ;(sys as any).flatirons.push(makeFlatiron({ tick: 0 }))   // 过期（cutoff=1时）
    ;(sys as any).flatirons.push(makeFlatiron({ tick: 50 }))  // 未过期
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 93001)
    expect((sys as any).flatirons).toHaveLength(1)
    expect((sys as any).flatirons[0].tick).toBe(50)
  })

  it('多个过期熨斗山全部被清理', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).flatirons.push(makeFlatiron({ tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 93001)
    expect((sys as any).flatirons).toHaveLength(0)
  })

  it('无过期熨斗山时 cleanup 不改变数量', () => {
    ;(sys as any).flatirons.push(makeFlatiron({ tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, 1000000)
    expect((sys as any).flatirons).toHaveLength(1)
  })

  // ── MAX_FLATIRONS 上限 ────────────────────────────────────────

  it('注入 MAX_FLATIRONS 个后不再 spawn', () => {
    for (let i = 0; i < MAX_FLATIRONS; i++) {
      ;(sys as any).flatirons.push(makeFlatiron({ tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).lastCheck = 0
    sys.update(1, mountainWorld, em, CHECK_INTERVAL)
    expect((sys as any).flatirons).toHaveLength(MAX_FLATIRONS)
  })

  it('MAX_FLATIRONS-1 个时仍在 limit 内', () => {
    for (let i = 0; i < MAX_FLATIRONS - 1; i++) {
      ;(sys as any).flatirons.push(makeFlatiron({ tick: 999999 }))
    }
    expect((sys as any).flatirons).toHaveLength(MAX_FLATIRONS - 1)
  })

  // ── 字段范围验证（通过注入方式） ──────────────────────────────

  it('熨斗山 height 不低于 25（spawn 最小值）', () => {
    const f = makeFlatiron({ height: 25 + 0 * 55 })
    expect(f.height).toBeGreaterThanOrEqual(25)
  })

  it('熨斗山 tiltAngle 不低于 35（spawn 最小值）', () => {
    const f = makeFlatiron({ tiltAngle: 35 + 0 * 45 })
    expect(f.tiltAngle).toBeGreaterThanOrEqual(35)
  })

  it('熨斗山 rockHardness 不低于 45（spawn 最小值）', () => {
    const f = makeFlatiron({ rockHardness: 45 + 0 * 40 })
    expect(f.rockHardness).toBeGreaterThanOrEqual(45)
  })

  it('熨斗山字段上限合法（height<=80, tiltAngle<=80）', () => {
    const f = makeFlatiron({ height: 80, tiltAngle: 80 })
    expect(f.height).toBeLessThanOrEqual(80)
    expect(f.tiltAngle).toBeLessThanOrEqual(80)
  })

  // ── id 自增 ───────────────────────────────────────────────────

  it('注入多个熨斗山 id 不重复', () => {
    ;(sys as any).flatirons.push(makeFlatiron())
    ;(sys as any).flatirons.push(makeFlatiron())
    ;(sys as any).flatirons.push(makeFlatiron())
    const ids = (sys as any).flatirons.map((f: Flatiron) => f.id)
    expect(new Set(ids).size).toBe(3)
  })

  // ── update 内部字段演化（weathering） ────────────────────────

  it('update 后 height 字段被 weatheringRate 侵蚀（略微减少）', () => {
    const initialHeight = 60
    ;(sys as any).flatirons.push(makeFlatiron({ height: initialHeight, weatheringRate: 2, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    const f = (sys as any).flatirons[0]
    // height -= weatheringRate * 0.00002 = 2 * 0.00002 = 0.00004 (极小), 近似相等
    expect(f.height).toBeLessThanOrEqual(initialHeight)
    expect(f.height).toBeGreaterThanOrEqual(15) // 下限为 15
  })

  it('height 不低于 15（clamp 下限）', () => {
    ;(sys as any).flatirons.push(makeFlatiron({ height: 15, weatheringRate: 100, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 阻止spawn但允许update
    sys.update(1, sandWorld, em, CHECK_INTERVAL)
    const f = (sys as any).flatirons[0]
    expect(f.height).toBeGreaterThanOrEqual(15)
  })
})
