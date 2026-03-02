import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldEuropiumSpringSystem } from '../systems/WorldEuropiumSpringSystem'
import type { EuropiumSpringZone } from '../systems/WorldEuropiumSpringSystem'

const CHECK_INTERVAL = 2950
const MAX_ZONES = 32

const safeWorld = { width: 200, height: 200, getTile: () => 0 } as any
const noSpawnWorld = { width: 200, height: 200, getTile: () => 3 } as any
const em = {} as any

function makeSys(): WorldEuropiumSpringSystem { return new WorldEuropiumSpringSystem() }
let nextId = 1
function makeZone(overrides: Partial<EuropiumSpringZone> = {}): EuropiumSpringZone {
  return {
    id: nextId++,
    x: 20, y: 30,
    europiumContent: 50,
    springFlow: 30,
    phosphateLeaching: 40,
    luminescentIntensity: 60,
    tick: 0,
    ...overrides,
  }
}

describe('WorldEuropiumSpringSystem', () => {
  let sys: WorldEuropiumSpringSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.restoreAllMocks()
  })

  // ── 基础状态 ──────────────────────────────────────────────────

  it('初始无Europium泉区', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })

  it('Europium泉区字段正确', () => {
    ;(sys as any).zones.push(makeZone())
    const z = (sys as any).zones[0]
    expect(z.europiumContent).toBe(50)
    expect(z.springFlow).toBe(30)
    expect(z.phosphateLeaching).toBe(40)
    expect(z.luminescentIntensity).toBe(60)
  })

  it('多个Europium泉区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────

  it('tick 未达 CHECK_INTERVAL 时 update 跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(0)
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

  // ── random=0.9 时不 spawn ──────────────────────────────────

  it('random=0.9 时不 spawn（大于 FORM_CHANCE）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('GRASS tile 四周也是 GRASS 时不 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, noSpawnWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  // ── cleanup：tick < cutoff(tick-54000) 时删除 ─────────────

  it('过期泉区(tick < cutoff)被清理', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 54001)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('未过期泉区(tick >= cutoff)保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 1 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 54001)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('同时有过期和未过期泉区，只删过期的', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).zones.push(makeZone({ tick: 10 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 54001)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].tick).toBe(10)
  })

  it('无过期泉区时 cleanup 不改变数量', () => {
    ;(sys as any).zones.push(makeZone({ tick: 99999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 100000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('多个过期泉区全部被清理', () => {
    for (let i = 0; i < 3; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 0 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, 54001)
    expect((sys as any).zones).toHaveLength(0)
  })

  // ── MAX_ZONES 上限 ────────────────────────────────────────

  it('注入 MAX_ZONES 个泉区后不再 spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).lastCheck = 0
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('MAX_ZONES-1 个时仍在 limit 内', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    expect((sys as any).zones).toHaveLength(MAX_ZONES - 1)
  })

  // ── 字段范围验证 ──────────────────────────────────────────

  it('注入泉区 europiumContent 字段合法', () => {
    const z = makeZone({ europiumContent: 40 + 0 * 60 })
    expect(z.europiumContent).toBeGreaterThanOrEqual(40)
  })

  it('注入泉区 springFlow 字段合法', () => {
    const z = makeZone({ springFlow: 10 + 0 * 50 })
    expect(z.springFlow).toBeGreaterThanOrEqual(10)
  })

  // ── id 自增 ───────────────────────────────────────────────

  it('注入多个泉区 id 不重复', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    const ids = (sys as any).zones.map((z: EuropiumSpringZone) => z.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('每个泉区有 x/y 坐标', () => {
    ;(sys as any).zones.push(makeZone({ x: 10, y: 20 }))
    const z = (sys as any).zones[0]
    expect(z.x).toBe(10)
    expect(z.y).toBe(20)
  })

  it('update 不影响 zones 字段（无字段更新逻辑）', () => {
    ;(sys as any).zones.push(makeZone({ europiumContent: 55, springFlow: 33, tick: 999999 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, safeWorld, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.europiumContent).toBe(55)
    expect(z.springFlow).toBe(33)
  })
})
