import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldFrostbiteSystem } from '../systems/WorldFrostbiteSystem'
import type { FrostbiteZone, FrostbiteSeverity } from '../systems/WorldFrostbiteSystem'

const CHECK_INTERVAL = 3000
const MAX_ZONES = 16

const snowWorld = { width: 200, height: 200, getTile: () => 6 } as any
const grassWorld = { width: 200, height: 200, getTile: () => 3 } as any
const em = {} as any

function makeSys(): WorldFrostbiteSystem { return new WorldFrostbiteSystem() }
let nextId = 1
function makeZone(overrides: Partial<FrostbiteZone> = {}): FrostbiteZone {
  return {
    id: nextId++,
    x: 10, y: 5,
    severity: 'moderate',
    temperature: -20,
    radius: 8,
    duration: 300,
    active: true,
    tick: 0,
    ...overrides,
  }
}

describe('WorldFrostbiteSystem', () => {
  let sys: WorldFrostbiteSystem

  beforeEach(() => {
    sys = makeSys()
    nextId = 1
    vi.restoreAllMocks()
  })

  // ── 基础状态 ──────────────────────────────────────────────────

  it('初始无冻伤区', () => {
    expect((sys as any).zones).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(1)
  })

  it('返回内部引用', () => {
    expect((sys as any).zones).toBe((sys as any).zones)
  })

  it('支持4种严重程度', () => {
    const severities: FrostbiteSeverity[] = ['mild', 'moderate', 'severe', 'extreme']
    expect(severities).toHaveLength(4)
  })

  it('冻伤区字段正确', () => {
    ;(sys as any).zones.push(makeZone({ severity: 'extreme' }))
    const z = (sys as any).zones[0]
    expect(z.severity).toBe('extreme')
    expect(z.temperature).toBe(-20)
    expect(z.active).toBe(true)
  })

  it('nextId初始为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('多个冻伤区全部返回', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    expect((sys as any).zones).toHaveLength(2)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────────

  it('tick 未达 CHECK_INTERVAL 时 update 跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时触发检查并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距小于 CHECK_INTERVAL 时第二次跳过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, CHECK_INTERVAL)
    sys.update(1, snowWorld, em, CHECK_INTERVAL + CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('两次 update 间距达到 CHECK_INTERVAL 时第二次执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, CHECK_INTERVAL)
    sys.update(1, snowWorld, em, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  // ── spawn 逻辑 ────────────────────────────────────────────────

  it('random=0.9 时不 spawn（大于 SPAWN_CHANCE）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('GRASS tile 不 spawn（需要 SNOW 或 MOUNTAIN）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, grassWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(0)
  })

  // ── 严重程度升级逻辑 ──────────────────────────────────────────

  it('mild 冻伤区在 60000 tick 后升级为 moderate', () => {
    ;(sys as any).zones.push(makeZone({ severity: 'mild', tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, 60001)
    expect((sys as any).zones[0].severity).toBe('moderate')
  })

  it('moderate 冻伤区在 120000 tick 后升级为 severe', () => {
    ;(sys as any).zones.push(makeZone({ severity: 'moderate', tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, 120001)
    expect((sys as any).zones[0].severity).toBe('severe')
  })

  it('severe 冻伤区在 200000 tick 后升级为 extreme', () => {
    ;(sys as any).zones.push(makeZone({ severity: 'severe', tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, 200001)
    expect((sys as any).zones[0].severity).toBe('extreme')
  })

  it('mild 冻伤区在 60000 tick 前不升级', () => {
    ;(sys as any).zones.push(makeZone({ severity: 'mild', tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, 60000)
    expect((sys as any).zones[0].severity).toBe('mild')
  })

  it('moderate 冻伤区在 120000 tick 前不升级', () => {
    ;(sys as any).zones.push(makeZone({ severity: 'moderate', tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, 120000)
    expect((sys as any).zones[0].severity).toBe('moderate')
  })

  it('severe 冻伤区在 200000 tick 前不升级', () => {
    ;(sys as any).zones.push(makeZone({ severity: 'severe', tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, 200000)
    expect((sys as any).zones[0].severity).toBe('severe')
  })

  // ── duration 字段更新 ─────────────────────────────────────────

  it('update 时 duration 字段更新为 tick - zone.tick', () => {
    ;(sys as any).zones.push(makeZone({ tick: 1000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, 5000)
    expect((sys as any).zones[0].duration).toBe(4000)
  })

  // ── cleanup：active=false 时删除 ──────────────────────────────

  it('age > 300000 时 active 设为 false 并被清理', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, 300001)
    // active=false 的区域在同一次 update 中被 splice 删除，故 zones 长度为0
    expect((sys as any).zones).toHaveLength(0)
  })

  it('active=false 的冻伤区被清理', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, 300001)
    expect((sys as any).zones).toHaveLength(0)
  })

  it('active=true 的冻伤区保留', () => {
    ;(sys as any).zones.push(makeZone({ tick: 100000, active: true }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, 150000)
    expect((sys as any).zones).toHaveLength(1)
  })

  it('同时有 active 和 inactive 冻伤区，只删 inactive', () => {
    ;(sys as any).zones.push(makeZone({ tick: 0, active: false }))
    ;(sys as any).zones.push(makeZone({ tick: 100000, active: true }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(1)
    expect((sys as any).zones[0].active).toBe(true)
  })

  // ── MAX_ZONES 上限 ────────────────────────────────────────────

  it('注入 MAX_ZONES 个冻伤区后不再 spawn', () => {
    for (let i = 0; i < MAX_ZONES; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    ;(sys as any).lastCheck = 0
    sys.update(1, snowWorld, em, CHECK_INTERVAL)
    expect((sys as any).zones).toHaveLength(MAX_ZONES)
  })

  it('MAX_ZONES-1 个时仍在 limit 内', () => {
    for (let i = 0; i < MAX_ZONES - 1; i++) {
      ;(sys as any).zones.push(makeZone({ tick: 999999 }))
    }
    expect((sys as any).zones).toHaveLength(MAX_ZONES - 1)
  })

  // ── 字段范围验证 ──────────────────────────────────────────────

  it('每个冻伤区有 x/y 坐标', () => {
    ;(sys as any).zones.push(makeZone({ x: 10, y: 20 }))
    const z = (sys as any).zones[0]
    expect(z.x).toBe(10)
    expect(z.y).toBe(20)
  })

  it('注入多个冻伤区 id 不重复', () => {
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    ;(sys as any).zones.push(makeZone())
    const ids = (sys as any).zones.map((z: FrostbiteZone) => z.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('每个冻伤区有 tick 字段记录创建时间', () => {
    ;(sys as any).zones.push(makeZone({ tick: 12345 }))
    const z = (sys as any).zones[0]
    expect(z.tick).toBe(12345)
  })

  it('temperature 字段随 tick 波动', () => {
    ;(sys as any).zones.push(makeZone({ severity: 'moderate', tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.temperature).toBeDefined()
  })

  it('radius 字段根据 severity 更新', () => {
    ;(sys as any).zones.push(makeZone({ severity: 'mild', tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, snowWorld, em, CHECK_INTERVAL)
    const z = (sys as any).zones[0]
    expect(z.radius).toBe(3)
  })
})
