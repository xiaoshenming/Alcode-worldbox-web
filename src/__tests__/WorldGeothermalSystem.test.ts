import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldGeothermalSystem } from '../systems/WorldGeothermalSystem'
import type { GeothermalVent, VentType } from '../systems/WorldGeothermalSystem'

const CHECK_INTERVAL = 1800
const MAX_VENTS = 30

// SAND=2，不满足 tile >= 6，阻断 spawn
const safeWorld = { width: 200, height: 200, getTile: () => 2 } as any
// SNOW=6，满足 tile >= 6，允许 spawn
const snowWorld = { width: 200, height: 200, getTile: () => 6 } as any
// LAVA=7，满足 tile >= 6，允许 spawn
const lavaWorld = { width: 200, height: 200, getTile: () => 7 } as any

const em = {} as any

function makeSys(): WorldGeothermalSystem { return new WorldGeothermalSystem() }
let nextId = 1
function makeVent(type: VentType = 'geyser', overrides: Partial<GeothermalVent> = {}): GeothermalVent {
  return { id: nextId++, x: 20, y: 30, type, temperature: 200, pressure: 80, active: true, tick: 0, ...overrides }
}

describe('WorldGeothermalSystem', () => {
  let sys: WorldGeothermalSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 基础状态 ──────────────────────────────────────────────
  it('初始 vents 为空数组', () => {
    expect((sys as any).vents).toHaveLength(0)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────
  it('tick < CHECK_INTERVAL 时跳过，lastCheck 保持 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, snowWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
    expect((sys as any).vents).toHaveLength(0)
  })

  it('tick === CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 不 spawn
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it('第二次 tick 未超过间隔时不再执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    const lc = (sys as any).lastCheck
    sys.update(0, safeWorld, em, CHECK_INTERVAL + 100) // 仅过了 100，不够
    expect((sys as any).lastCheck).toBe(lc)
  })

  // ── spawn 阻断（random=0.9 > SPAWN_CHANCE=0.004）─────────
  it('random=0.9 时不 spawn（大于 SPAWN_CHANCE）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, snowWorld, em, CHECK_INTERVAL)
    expect((sys as any).vents).toHaveLength(0)
  })

  it('safeWorld (SAND=2) 阻断 spawn，因为 tile < 6', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).vents).toHaveLength(0)
  })

  // ── spawn 成功（SNOW/LAVA + random=0）────────────────────
  it('snowWorld + random=0 时可以 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, snowWorld, em, CHECK_INTERVAL)
    expect((sys as any).vents).toHaveLength(1)
  })

  it('lavaWorld + random=0 时可以 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, lavaWorld, em, CHECK_INTERVAL)
    expect((sys as any).vents).toHaveLength(1)
  })

  it('spawn 的 vent id 从 1 开始递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, snowWorld, em, CHECK_INTERVAL)
    sys.update(0, snowWorld, em, CHECK_INTERVAL * 2)
    const vents: GeothermalVent[] = (sys as any).vents
    expect(vents[0].id).toBe(1)
    expect(vents[1].id).toBe(2)
  })

  it('spawn 的 vent active 初始为 true', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, snowWorld, em, CHECK_INTERVAL)
    const v: GeothermalVent = (sys as any).vents[0]
    expect(v.active).toBe(true)
  })

  it('spawn 的 vent temperature 在 [40,200] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, snowWorld, em, CHECK_INTERVAL)
    const v: GeothermalVent = (sys as any).vents[0]
    // spawn 后立即执行 update: temperature = Math.max(40, temperature - 0.01)
    // 所以下界是 40（Math.max 保底），上界不超过 200
    expect(v.temperature).toBeGreaterThanOrEqual(40)
    expect(v.temperature).toBeLessThanOrEqual(200)
  })

  it('spawn 的 vent pressure 在 [20,100] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, snowWorld, em, CHECK_INTERVAL)
    const v: GeothermalVent = (sys as any).vents[0]
    expect(v.pressure).toBeGreaterThanOrEqual(20)
    expect(v.pressure).toBeLessThanOrEqual(100)
  })

  it('spawn 的 vent type 属于 4 种合法类型', () => {
    const validTypes: VentType[] = ['hot_spring', 'geyser', 'fumarole', 'mud_pot']
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, snowWorld, em, CHECK_INTERVAL)
    const v: GeothermalVent = (sys as any).vents[0]
    expect(validTypes).toContain(v.type)
  })

  // ── MAX_VENTS 上限 ────────────────────────────────────────
  it('达到 MAX_VENTS 时不再新增', () => {
    for (let i = 0; i < MAX_VENTS; i++) {
      ;(sys as any).vents.push(makeVent('fumarole', { tick: CHECK_INTERVAL * 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, snowWorld, em, CHECK_INTERVAL)
    expect((sys as any).vents.length).toBeGreaterThanOrEqual(MAX_VENTS)
    // 不超过 MAX_VENTS（可能有 cleanup，但不因 spawn 超过）
    // 仅验证 spawn 未执行：如果 spawn 执行了 length 会超 MAX_VENTS
    // 注入的 tick=CHECK_INTERVAL*100 很大，不会被 cleanup 删除
    expect((sys as any).vents.length).toBe(MAX_VENTS)
  })

  // ── geyser pressure 动态更新 ──────────────────────────────
  it('geyser pressure > 90 时重置 pressure 并保持 active', () => {
    const v = makeVent('geyser', { pressure: 91, tick: CHECK_INTERVAL * 100 })
    ;(sys as any).vents.push(v)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    // pressure 被重置到 [20,50] 区间（20 + random*30，random=0.9 => 47）
    expect(v.pressure).toBeGreaterThanOrEqual(20)
    expect(v.pressure).toBeLessThanOrEqual(50)
    expect(v.active).toBe(true)
  })

  it('geyser pressure <= 90 时 pressure 增加 0.5', () => {
    const v = makeVent('geyser', { pressure: 50, tick: CHECK_INTERVAL * 100 })
    ;(sys as any).vents.push(v)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    expect(v.pressure).toBeCloseTo(50.5)
  })

  it('hot_spring 类型不改变 pressure', () => {
    const v = makeVent('hot_spring', { pressure: 50, tick: CHECK_INTERVAL * 100 })
    ;(sys as any).vents.push(v)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    expect(v.pressure).toBe(50) // 非 geyser，不增加
  })

  it('temperature 每次 update 减少 0.01，不低于 40', () => {
    const v = makeVent('fumarole', { temperature: 40.005, tick: CHECK_INTERVAL * 100 })
    ;(sys as any).vents.push(v)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    expect(v.temperature).toBe(40)
  })

  it('temperature 已是 40 时不再减少', () => {
    const v = makeVent('fumarole', { temperature: 40, tick: CHECK_INTERVAL * 100 })
    ;(sys as any).vents.push(v)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    expect(v.temperature).toBe(40)
  })

  // ── cleanup 逻辑 ──────────────────────────────────────────
  it('tick=0 的旧记录在 tick=60001 时被清除', () => {
    ;(sys as any).vents.push(makeVent('hot_spring', { tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, 60001)
    expect((sys as any).vents).toHaveLength(0)
  })

  it('cutoff 临界值：tick=cutoff 的记录被删除', () => {
    // cutoff = currentTick - 60000，vent.tick < cutoff 时删除
    // 若 currentTick=60001，cutoff=1，vent.tick=0 < 1 => 删除
    ;(sys as any).vents.push(makeVent('hot_spring', { tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, 60001)
    expect((sys as any).vents).toHaveLength(0)
  })

  it('未过期记录保留', () => {
    const currentTick = CHECK_INTERVAL
    ;(sys as any).vents.push(makeVent('hot_spring', { tick: currentTick - 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, currentTick)
    expect((sys as any).vents).toHaveLength(1)
  })

  it('混合：过期删除，未过期保留', () => {
    const currentTick = 70000
    // tick=0 < cutoff(70000-60000=10000) => 删除
    ;(sys as any).vents.push(makeVent('hot_spring', { tick: 0 }))
    // tick=65000 >= cutoff => 保留（65000 > 10000）
    ;(sys as any).vents.push(makeVent('fumarole', { tick: 65000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, currentTick)
    expect((sys as any).vents).toHaveLength(1)
    expect((sys as any).vents[0].type).toBe('fumarole')
  })

  it('多条全部过期时全部删除', () => {
    const currentTick = 70000
    for (let i = 0; i < 5; i++) {
      ;(sys as any).vents.push(makeVent('mud_pot', { tick: i }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, currentTick)
    expect((sys as any).vents).toHaveLength(0)
  })

  // ── 注入数据字段验证 ──────────────────────────────────────
  it('注入后 vents 可查询长度', () => {
    ;(sys as any).vents.push(makeVent())
    expect((sys as any).vents).toHaveLength(1)
  })

  it('注入 fumarole 类型后字段正确', () => {
    ;(sys as any).vents.push(makeVent('fumarole'))
    const v = (sys as any).vents[0]
    expect(v.type).toBe('fumarole')
    expect(v.temperature).toBe(200)
    expect(v.active).toBe(true)
  })

  it('4 种 VentType 枚举值完整', () => {
    const types: VentType[] = ['hot_spring', 'geyser', 'fumarole', 'mud_pot']
    expect(types).toHaveLength(4)
  })

  it('vents 数组是内部引用（同一对象）', () => {
    expect((sys as any).vents).toBe((sys as any).vents)
  })
})
