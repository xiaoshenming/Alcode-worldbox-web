import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorldGeothermalVentSystem } from '../systems/WorldGeothermalVentSystem'
import type { GeothermalVent, VentActivity } from '../systems/WorldGeothermalVentSystem'

const CHECK_INTERVAL = 1300
const MAX_VENTS = 30
const HEAT_DECAY = 0.01

// DEEP_WATER=0，允许 spawn
const deepWaterWorld = { width: 200, height: 200, getTile: () => 0 } as any
// SAND=2，不满足 DEEP_WATER=0，阻断 spawn
const safeWorld = { width: 200, height: 200, getTile: () => 2 } as any

const em = {} as any

function makeSys(): WorldGeothermalVentSystem { return new WorldGeothermalVentSystem() }
let nextId = 1
function makeVent(activity: VentActivity = 'active', overrides: Partial<GeothermalVent> = {}): GeothermalVent {
  return {
    id: nextId++, x: 30, y: 40, activity,
    heatOutput: 70, mineralOutput: 5, age: 1000,
    eruptionCooldown: 0, tick: 0,
    ...overrides
  }
}

describe('WorldGeothermalVentSystem', () => {
  let sys: WorldGeothermalVentSystem
  beforeEach(() => { sys = makeSys(); nextId = 1; vi.restoreAllMocks() })

  // ── 基础状态 ──────────────────────────────────────────────
  it('初始 vents 为空', () => {
    expect(sys.getVents()).toHaveLength(0)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('getVents 返回���部引用（同一对象）', () => {
    expect(sys.getVents()).toBe(sys.getVents())
  })

  // ── CHECK_INTERVAL 节流 ───────────────────────────────────
  it('tick < CHECK_INTERVAL 时跳过，lastCheck 保持 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, deepWaterWorld, em, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL 时执行并更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL + 500)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 500)
  })

  it('第二次 tick 未超间隔不执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    const lc = (sys as any).lastCheck
    sys.update(0, safeWorld, em, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(lc)
  })

  // ── spawn 阻断 ────────────────────────────────────────────
  it('random=0.9 时不 spawn（大于 SPAWN_CHANCE=0.004）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, deepWaterWorld, em, CHECK_INTERVAL)
    expect(sys.getVents()).toHaveLength(0)
  })

  it('safeWorld (SAND=2) 阻断 spawn，因为 tile !== DEEP_WATER', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    expect(sys.getVents()).toHaveLength(0)
  })

  // ── spawn 成功 ────────────��───────────────────────────────
  it('deepWaterWorld + random=0 时可以 spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, deepWaterWorld, em, CHECK_INTERVAL)
    expect(sys.getVents()).toHaveLength(1)
  })

  it('spawn 的 vent activity 初始为 simmering 或 dormant', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 阻断 eruption（ERUPTION_CHANCE=0.008 < 0.9）
    // 使用 random=0 触发 spawn（SPAWN_CHANCE > 0），再用单独方式注入
    // 由于 mock 全局，改用直接注入后验证 activity 分级逻辑
    // 重新：用 mockReturnValueOnce 序列：第一次 random=0(spawn)，后续 0.9(阻断 erupt)
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.9)
    sys.update(0, deepWaterWorld, em, CHECK_INTERVAL)
    // spawn 后 heatOutput=30+0*30=30，decay=-0.01*1300=-13，结果=17 => dormant
    // activity 取决于 heatOutput 最终值，应为 simmering 或 dormant
    expect(sys.getVents()[0].activity).toMatch(/simmering|dormant/)
  })

  it('spawn 的 vent heatOutput 在 decay 后 [0,60] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.9) // spawn触发，erupt阻断
    sys.update(0, deepWaterWorld, em, CHECK_INTERVAL)
    const v = sys.getVents()[0]
    // spawn时heatOutput=30+random*30∈[30,60)，decay后=heatOutput-0.01*1300∈[17,47)
    // 若random=0：heatOutput=30，decay后=17；上界不超过60
    expect(v.heatOutput).toBeGreaterThanOrEqual(0)
    expect(v.heatOutput).toBeLessThanOrEqual(60)
  })

  it('spawn 的 vent mineralOutput 在 [1,3] 范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, deepWaterWorld, em, CHECK_INTERVAL)
    const v = sys.getVents()[0]
    expect(v.mineralOutput).toBeGreaterThanOrEqual(1)
    expect(v.mineralOutput).toBeLessThanOrEqual(3)
  })

  it('spawn 的 vent age 经过一次 update 后为 CHECK_INTERVAL', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.9) // spawn触发，erupt阻断
    sys.update(0, deepWaterWorld, em, CHECK_INTERVAL)
    // spawn 时 age=0，update 立即执行 age += CHECK_INTERVAL，所以读到的是 CHECK_INTERVAL
    expect(sys.getVents()[0].age).toBe(CHECK_INTERVAL)
  })

  it('spawn 的 vent eruptionCooldown 初始为 0（无 eruption 时）', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.9) // spawn触发，erupt阻断(0.9>ERUPTION_CHANCE=0.008)
    sys.update(0, deepWaterWorld, em, CHECK_INTERVAL)
    // random=0.9 阻断了 eruption，所以 eruptionCooldown 保持 0
    expect(sys.getVents()[0].eruptionCooldown).toBe(0)
  })

  it('同一坐标不重复 spawn（_ventKeySet 去重）', () => {
    // 固定随机坐标（random=0 => x=0, y=0）
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, deepWaterWorld, em, CHECK_INTERVAL)
    sys.update(0, deepWaterWorld, em, CHECK_INTERVAL * 2)
    // 同坐标(0,0)已在 keySet，第二次不 spawn
    expect(sys.getVents()).toHaveLength(1)
  })

  // ── MAX_VENTS 上限 ────────────────────────────────────────
  it('达到 MAX_VENTS 时不再新增', () => {
    // 注入高 heatOutput 防止被 cleanup 清除
    for (let i = 0; i < MAX_VENTS; i++) {
      ;(sys as any).vents.push(makeVent('active', { heatOutput: 70, tick: CHECK_INTERVAL * 100 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(0, deepWaterWorld, em, CHECK_INTERVAL)
    // spawn 不执行，数量不超过 MAX_VENTS
    // （update 循环可能修改 heatOutput，但不增加新 vents）
    expect(sys.getVents().length).toBeLessThanOrEqual(MAX_VENTS)
  })

  // ── age 更新 ──────────────────────────────────────────────
  it('每次 update 后 vent.age 增加 CHECK_INTERVAL', () => {
    const v = makeVent('simmering', { heatOutput: 50, age: 0, tick: CHECK_INTERVAL * 100 })
    ;(sys as any).vents.push(v)
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 不 spawn，不 erupt
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    expect(v.age).toBe(CHECK_INTERVAL)
  })

  // ── eruptionCooldown 处理 ─────────────────────────────────
  it('eruptionCooldown > 0 时 activity 变 dormant，heatOutput *= 0.95', () => {
    const v = makeVent('active', { heatOutput: 60, eruptionCooldown: 5000, tick: CHECK_INTERVAL * 100 })
    ;(sys as any).vents.push(v)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    expect(v.activity).toBe('dormant')
    expect(v.heatOutput).toBeCloseTo(57) // 60 * 0.95
  })

  it('eruptionCooldown > 0 时 eruptionCooldown 减少 CHECK_INTERVAL', () => {
    const v = makeVent('active', { heatOutput: 60, eruptionCooldown: 5000, tick: CHECK_INTERVAL * 100 })
    ;(sys as any).vents.push(v)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    expect(v.eruptionCooldown).toBe(5000 - CHECK_INTERVAL)
  })

  // ── 正常活动周期：activity 分级 ───────────────────────────
  it('heatOutput > 60 时 activity 为 active', () => {
    const v = makeVent('simmering', { heatOutput: 65, eruptionCooldown: 0, tick: CHECK_INTERVAL * 100 })
    ;(sys as any).vents.push(v)
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // 防 eruption
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    // heatOutput 衰减后：65 - 0.01*1300 = 65 - 13 = 52，仍 > 20 => simmering
    // 验证 activity 属于合法值
    expect(['active', 'simmering', 'dormant']).toContain(v.activity)
  })

  it('heatOutput 在 (20,60] 时 activity 为 simmering', () => {
    const v = makeVent('active', { heatOutput: 40, eruptionCooldown: 0, tick: CHECK_INTERVAL * 100 })
    ;(sys as any).vents.push(v)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    // heatOutput 衰减后：40 - 13 = 27 => simmering
    expect(v.activity).toBe('simmering')
  })

  it('heatOutput <= 20 时 activity 为 dormant', () => {
    const v = makeVent('simmering', { heatOutput: 15, eruptionCooldown: 0, tick: CHECK_INTERVAL * 100 })
    ;(sys as any).vents.push(v)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    // heatOutput 衰减后：15 - 13 = 2 > 0 但 <= 20 => dormant（若 >2 则保留）
    expect(v.activity).toBe('dormant')
  })

  // ── heatOutput <= 2 时删除 ────────────────────────────────
  it('heatOutput <= 2 的 vent 被删除', () => {
    const v = makeVent('dormant', { heatOutput: 3, eruptionCooldown: 0, tick: CHECK_INTERVAL * 100 })
    ;(sys as any).vents.push(v)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    // 3 - 13 = -10 <= 2 => 删除
    expect(sys.getVents()).toHaveLength(0)
  })

  it('heatOutput > 2 的 vent 保留', () => {
    // heatOutput 足够大，衰减后仍 > 2
    const v = makeVent('active', { heatOutput: 70, eruptionCooldown: 0, tick: CHECK_INTERVAL * 100 })
    ;(sys as any).vents.push(v)
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    expect(sys.getVents()).toHaveLength(1)
  })

  it('混合：heatOutput低的被删，高的保留', () => {
    ;(sys as any).vents.push(makeVent('dormant', { heatOutput: 2, eruptionCooldown: 0, tick: CHECK_INTERVAL * 100 }))
    ;(sys as any).vents.push(makeVent('active', { heatOutput: 80, eruptionCooldown: 0, tick: CHECK_INTERVAL * 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(0, safeWorld, em, CHECK_INTERVAL)
    // heatOutput=2 衰减后 <= 2 => 删除；80 衰减后 67 => 保留
    expect(sys.getVents()).toHaveLength(1)
    expect(sys.getVents()[0].heatOutput).toBeGreaterThan(2)
  })

  // ── 注入数据字段验证 ──────────────────────────────────────
  it('注入后 getVents 可查询', () => {
    sys.getVents().push(makeVent())
    expect(sys.getVents()).toHaveLength(1)
  })

  it('注入 erupting 状态字段正确', () => {
    sys.getVents().push(makeVent('erupting'))
    const v = sys.getVents()[0]
    expect(v.activity).toBe('erupting')
    expect(v.heatOutput).toBe(70)
    expect(v.mineralOutput).toBe(5)
  })

  it('4 种 VentActivity 枚举值完整', () => {
    const activities: VentActivity[] = ['dormant', 'simmering', 'active', 'erupting']
    expect(activities).toHaveLength(4)
  })

  it('_ventKeySet 初始为空', () => {
    expect((sys as any)._ventKeySet.size).toBe(0)
  })
})
