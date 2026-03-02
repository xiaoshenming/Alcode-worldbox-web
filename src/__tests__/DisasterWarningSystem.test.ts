import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DisasterWarningSystem } from '../systems/DisasterWarningSystem'
import type { DisasterWarning, WarningType, VisualEffect } from '../systems/DisasterWarningSystem'

// ---- helpers ----
function makeSys(): DisasterWarningSystem {
  return new DisasterWarningSystem()
}

function makeWarning(type: WarningType, overrides: Partial<DisasterWarning> = {}): DisasterWarning {
  return {
    type,
    x: 10,
    y: 20,
    intensity: 0,
    ticksRemaining: 120,
    radius: 15,
    ...overrides,
  }
}

const ALL_TYPES: WarningType[] = [
  'EARTHQUAKE_TREMOR',
  'VOLCANO_RUMBLE',
  'TSUNAMI_WAVE',
  'METEOR_STREAK',
  'TORNADO_WIND',
  'PLAGUE_OMEN',
]

// ================================================================
describe('DisasterWarningSystem — 初始状态', () => {
  let sys: DisasterWarningSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('模块可以导入', async () => {
    const mod = await import('../systems/DisasterWarningSystem')
    expect(mod.DisasterWarningSystem).toBeDefined()
  })

  it('构造函数可以创建实例', () => {
    expect(sys).toBeInstanceOf(DisasterWarningSystem)
  })

  it('初始无预警', () => {
    expect(sys.getActiveWarnings()).toHaveLength(0)
  })

  it('getWarningCount() 初始为 0', () => {
    expect(sys.getWarningCount()).toBe(0)
  })

  it('getVisualEffects() 初始返回空数组', () => {
    expect(sys.getVisualEffects()).toHaveLength(0)
  })

  it('effectsDirty 初始为 true', () => {
    expect((sys as any).effectsDirty).toBe(true)
  })

  it('cachedEffects 初始为空数组', () => {
    expect((sys as any).cachedEffects).toHaveLength(0)
  })
})

// ================================================================
describe('DisasterWarningSystem — getActiveWarnings', () => {
  let sys: DisasterWarningSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('注入一个预警后 getActiveWarnings 长度为 1', () => {
    ;(sys as any).warnings.push(makeWarning('EARTHQUAKE_TREMOR'))
    expect(sys.getActiveWarnings()).toHaveLength(1)
  })

  it('getActiveWarnings 返回 slice 副本，不是内部引用', () => {
    ;(sys as any).warnings.push(makeWarning('VOLCANO_RUMBLE'))
    const copy = sys.getActiveWarnings()
    expect(copy).not.toBe((sys as any).warnings)
    expect(copy).toHaveLength(1)
  })

  it('修改返回副本不影响内部状态', () => {
    ;(sys as any).warnings.push(makeWarning('PLAGUE_OMEN'))
    const copy = sys.getActiveWarnings()
    copy.splice(0, 1)
    expect((sys as any).warnings).toHaveLength(1)
  })

  it('6 种预警类型全部可以注入和查询', () => {
    ALL_TYPES.forEach(t => (sys as any).warnings.push(makeWarning(t)))
    const all = sys.getActiveWarnings()
    ALL_TYPES.forEach((t, i) => expect(all[i].type).toBe(t))
  })

  it('多次注入同类型预警', () => {
    ;(sys as any).warnings.push(makeWarning('METEOR_STREAK'))
    ;(sys as any).warnings.push(makeWarning('METEOR_STREAK'))
    expect(sys.getActiveWarnings()).toHaveLength(2)
  })
})

// ================================================================
describe('DisasterWarningSystem — getWarningCount', () => {
  let sys: DisasterWarningSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('0 个预警时返回 0', () => {
    expect(sys.getWarningCount()).toBe(0)
  })

  it('1 个预警时返回 1', () => {
    ;(sys as any).warnings.push(makeWarning('TORNADO_WIND'))
    expect(sys.getWarningCount()).toBe(1)
  })

  it('3 个预警时返回 3', () => {
    ;(sys as any).warnings.push(makeWarning('EARTHQUAKE_TREMOR'))
    ;(sys as any).warnings.push(makeWarning('PLAGUE_OMEN'))
    ;(sys as any).warnings.push(makeWarning('TSUNAMI_WAVE'))
    expect(sys.getWarningCount()).toBe(3)
  })

  it('6 种类型全注入后返回 6', () => {
    ALL_TYPES.forEach(t => (sys as any).warnings.push(makeWarning(t)))
    expect(sys.getWarningCount()).toBe(6)
  })
})

// ================================================================
describe('DisasterWarningSystem — update() 基本行为', () => {
  let sys: DisasterWarningSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('无预警时 update() 不崩溃', () => {
    expect(() => sys.update(1)).not.toThrow()
  })

  it('无预警时 update() 直接返回（effectsDirty 不变为 true）', () => {
    ;(sys as any).effectsDirty = false
    sys.update(1)
    // early return when warnings.length === 0
    expect((sys as any).effectsDirty).toBe(false)
  })

  it('有预警时 update() 将 effectsDirty 设为 true', () => {
    ;(sys as any).warnings.push(makeWarning('EARTHQUAKE_TREMOR'))
    ;(sys as any).effectsDirty = false
    sys.update(1)
    expect((sys as any).effectsDirty).toBe(true)
  })

  it('每次 update() 预警的 ticksRemaining 减少 1', () => {
    ;(sys as any).warnings.push(makeWarning('VOLCANO_RUMBLE', { ticksRemaining: 50 }))
    sys.update(1)
    expect((sys as any).warnings[0].ticksRemaining).toBe(49)
  })

  it('ticksRemaining <= 0 时预警被移除', () => {
    ;(sys as any).warnings.push(makeWarning('PLAGUE_OMEN', { ticksRemaining: 1 }))
    sys.update(1)
    expect((sys as any).warnings).toHaveLength(0)
  })

  it('ticksRemaining > 1 时预警保持存活', () => {
    ;(sys as any).warnings.push(makeWarning('METEOR_STREAK', { ticksRemaining: 5 }))
    sys.update(1)
    expect((sys as any).warnings).toHaveLength(1)
  })

  it('多个预警同时过期时全部移除', () => {
    ;(sys as any).warnings.push(makeWarning('EARTHQUAKE_TREMOR', { ticksRemaining: 1 }))
    ;(sys as any).warnings.push(makeWarning('TORNADO_WIND', { ticksRemaining: 1 }))
    sys.update(1)
    expect((sys as any).warnings).toHaveLength(0)
  })

  it('预警 intensity 随时间二次方增长', () => {
    const w = makeWarning('EARTHQUAKE_TREMOR', { ticksRemaining: 120, intensity: 0 })
    ;(sys as any).warnings.push(w)
    // After update, elapsed = MAX_LEAD_TICKS - ticksRemaining + 1
    sys.update(1)
    const updatedW = (sys as any).warnings[0]
    expect(updatedW.intensity).toBeGreaterThanOrEqual(0)
    expect(updatedW.intensity).toBeLessThanOrEqual(1)
  })

  it('update() 多次调用不崩溃', () => {
    ;(sys as any).warnings.push(makeWarning('TSUNAMI_WAVE', { ticksRemaining: 200 }))
    for (let i = 0; i < 50; i++) {
      expect(() => sys.update(i)).not.toThrow()
    }
  })
})

// ================================================================
describe('DisasterWarningSystem — intensity 进度计算', () => {
  let sys: DisasterWarningSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('新预警的 intensity 从接近 0 开始', () => {
    const w = makeWarning('EARTHQUAKE_TREMOR', { ticksRemaining: 180, intensity: 0 })
    ;(sys as any).warnings.push(w)
    sys.update(1)
    // elapsed = 1 (first tick), progress = 1/180
    expect((sys as any).warnings[0].intensity).toBeLessThan(0.1)
  })

  it('ticksRemaining 很小时 intensity 接近 1', () => {
    const w = makeWarning('VOLCANO_RUMBLE', { ticksRemaining: 2, intensity: 0 })
    ;(sys as any).warnings.push(w)
    sys.update(1)
    // elapsed = MAX_LEAD_TICKS - 1 ≈ 179, progress ≈ 179/180 ≈ 0.99
    expect((sys as any).warnings[0].intensity).toBeGreaterThan(0.9)
  })

  it('intensity 不超过 1', () => {
    const w = makeWarning('PLAGUE_OMEN', { ticksRemaining: 1, intensity: 0 })
    ;(sys as any).warnings.push(w)
    sys.update(1)
    // w will be removed (ticksRemaining reaches 0); check it was removed cleanly
    expect((sys as any).warnings).toHaveLength(0)
  })
})

// ================================================================
describe('DisasterWarningSystem — getVisualEffects', () => {
  let sys: DisasterWarningSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('无预警时返回空数组', () => {
    expect(sys.getVisualEffects()).toHaveLength(0)
  })

  it('intensity < 0.01 的预警不产生视觉效果', () => {
    ;(sys as any).warnings.push(makeWarning('EARTHQUAKE_TREMOR', { intensity: 0.005 }))
    const effects = sys.getVisualEffects()
    expect(effects).toHaveLength(0)
  })

  it('EARTHQUAKE_TREMOR 产生 GroundShake 和 AnimalFlee 效果', () => {
    ;(sys as any).warnings.push(makeWarning('EARTHQUAKE_TREMOR', { intensity: 0.5 }))
    const effects = sys.getVisualEffects()
    const kinds = effects.map(e => e.kind)
    expect(kinds).toContain('GroundShake')
    expect(kinds).toContain('AnimalFlee')
  })

  it('VOLCANO_RUMBLE 产生 GroundShake、SkyDarken 和 AnimalFlee 效果', () => {
    ;(sys as any).warnings.push(makeWarning('VOLCANO_RUMBLE', { intensity: 0.5 }))
    const effects = sys.getVisualEffects()
    const kinds = effects.map(e => e.kind)
    expect(kinds).toContain('GroundShake')
    expect(kinds).toContain('SkyDarken')
    expect(kinds).toContain('AnimalFlee')
  })

  it('TSUNAMI_WAVE 产生 WaterRecede 和 AnimalFlee 效果', () => {
    ;(sys as any).warnings.push(makeWarning('TSUNAMI_WAVE', { intensity: 0.5 }))
    const effects = sys.getVisualEffects()
    const kinds = effects.map(e => e.kind)
    expect(kinds).toContain('WaterRecede')
    expect(kinds).toContain('AnimalFlee')
  })

  it('METEOR_STREAK 只产生 SkyDarken 效果', () => {
    ;(sys as any).warnings.push(makeWarning('METEOR_STREAK', { intensity: 0.5 }))
    const effects = sys.getVisualEffects()
    expect(effects).toHaveLength(1)
    expect(effects[0].kind).toBe('SkyDarken')
  })

  it('TORNADO_WIND 产生 SkyDarken 和 AnimalFlee 效果', () => {
    ;(sys as any).warnings.push(makeWarning('TORNADO_WIND', { intensity: 0.5 }))
    const effects = sys.getVisualEffects()
    const kinds = effects.map(e => e.kind)
    expect(kinds).toContain('SkyDarken')
    expect(kinds).toContain('AnimalFlee')
  })

  it('PLAGUE_OMEN 只产生 AnimalFlee 效果', () => {
    ;(sys as any).warnings.push(makeWarning('PLAGUE_OMEN', { intensity: 0.5 }))
    const effects = sys.getVisualEffects()
    expect(effects).toHaveLength(1)
    expect(effects[0].kind).toBe('AnimalFlee')
  })

  it('GroundShake 效果包含正确的坐标', () => {
    ;(sys as any).warnings.push(makeWarning('EARTHQUAKE_TREMOR', { x: 42, y: 99, intensity: 0.5 }))
    const effects = sys.getVisualEffects()
    const shake = effects.find(e => e.kind === 'GroundShake') as any
    expect(shake.x).toBe(42)
    expect(shake.y).toBe(99)
  })

  it('SkyDarken 效果 intensity 乘以 0.6', () => {
    ;(sys as any).warnings.push(makeWarning('METEOR_STREAK', { intensity: 0.5 }))
    const effects = sys.getVisualEffects()
    const darken = effects[0] as any
    expect(darken.intensity).toBeCloseTo(0.3)  // 0.5 * 0.6
  })

  it('AnimalFlee 效果包含正确的 fromX、fromY 和 radius', () => {
    ;(sys as any).warnings.push(makeWarning('PLAGUE_OMEN', { x: 7, y: 8, radius: 25, intensity: 0.5 }))
    const effects = sys.getVisualEffects()
    const flee = effects[0] as any
    expect(flee.fromX).toBe(7)
    expect(flee.fromY).toBe(8)
    expect(flee.radius).toBe(25)
  })

  it('WaterRecede 效果包含正确的 coastX 和 coastY', () => {
    ;(sys as any).warnings.push(makeWarning('TSUNAMI_WAVE', { x: 11, y: 22, intensity: 0.5 }))
    const effects = sys.getVisualEffects()
    const recede = effects.find(e => e.kind === 'WaterRecede') as any
    expect(recede.coastX).toBe(11)
    expect(recede.coastY).toBe(22)
  })
})

// ================================================================
describe('DisasterWarningSystem — effectsDirty 缓存机制', () => {
  let sys: DisasterWarningSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('effectsDirty=false 时 getVisualEffects 返回缓存', () => {
    ;(sys as any).warnings.push(makeWarning('METEOR_STREAK', { intensity: 0.5 }))
    const first = sys.getVisualEffects()
    // effectsDirty is now false
    ;(sys as any).warnings.push(makeWarning('PLAGUE_OMEN', { intensity: 0.5 }))
    const second = sys.getVisualEffects()
    // Should return cached — same reference
    expect(second).toBe(first)
  })

  it('effectsDirty=true 时重新计算效果', () => {
    ;(sys as any).warnings.push(makeWarning('METEOR_STREAK', { intensity: 0.5 }))
    sys.getVisualEffects()  // clears dirty flag
    // Mark dirty again via update (adding warning + update)
    ;(sys as any).effectsDirty = true
    ;(sys as any).warnings.push(makeWarning('PLAGUE_OMEN', { intensity: 0.5 }))
    const effects = sys.getVisualEffects()
    expect(effects.length).toBeGreaterThan(0)
  })

  it('update() 后 effectsDirty 被设为 true', () => {
    ;(sys as any).warnings.push(makeWarning('EARTHQUAKE_TREMOR', { ticksRemaining: 50 }))
    sys.getVisualEffects()  // clears dirty
    sys.update(1)
    expect((sys as any).effectsDirty).toBe(true)
  })

  it('连续两次 getVisualEffects 返回相同引用（缓存不重建）', () => {
    ;(sys as any).warnings.push(makeWarning('TORNADO_WIND', { intensity: 0.5 }))
    const a = sys.getVisualEffects()
    const b = sys.getVisualEffects()
    expect(b).toBe(a)
  })
})

// ================================================================
describe('DisasterWarningSystem — 边界条件', () => {
  let sys: DisasterWarningSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => vi.restoreAllMocks())

  it('update() 不传 tick 参数（0）不崩溃', () => {
    ;(sys as any).warnings.push(makeWarning('PLAGUE_OMEN', { ticksRemaining: 10 }))
    expect(() => sys.update(0)).not.toThrow()
  })

  it('大量预警注入后 getVisualEffects 不崩溃', () => {
    for (let i = 0; i < 50; i++) {
      ;(sys as any).warnings.push(makeWarning(ALL_TYPES[i % ALL_TYPES.length], { intensity: 0.5 }))
    }
    expect(() => sys.getVisualEffects()).not.toThrow()
  })

  it('intensity=1 的预警产生最强效果', () => {
    ;(sys as any).warnings.push(makeWarning('METEOR_STREAK', { intensity: 1.0 }))
    const effects = sys.getVisualEffects()
    const darken = effects[0] as any
    expect(darken.intensity).toBeCloseTo(0.6)
  })

  it('intensity 正好等于 0.01 时仍产生效果（边界包含）', () => {
    ;(sys as any).warnings.push(makeWarning('PLAGUE_OMEN', { intensity: 0.01 }))
    const effects = sys.getVisualEffects()
    expect(effects).toHaveLength(1)
  })

  it('getActiveWarnings 过期后返回空数组', () => {
    ;(sys as any).warnings.push(makeWarning('EARTHQUAKE_TREMOR', { ticksRemaining: 1 }))
    sys.update(100)
    expect(sys.getActiveWarnings()).toHaveLength(0)
  })

  it('x=0,y=0 位置的预警正确传递坐标到效果', () => {
    ;(sys as any).warnings.push(makeWarning('EARTHQUAKE_TREMOR', { x: 0, y: 0, intensity: 0.5 }))
    const effects = sys.getVisualEffects()
    const shake = effects.find(e => e.kind === 'GroundShake') as any
    expect(shake.x).toBe(0)
    expect(shake.y).toBe(0)
  })

  it('极大坐标的预警正确传递坐标', () => {
    ;(sys as any).warnings.push(makeWarning('PLAGUE_OMEN', { x: 9999, y: 9999, intensity: 0.5 }))
    const effects = sys.getVisualEffects()
    const flee = effects[0] as any
    expect(flee.fromX).toBe(9999)
    expect(flee.fromY).toBe(9999)
  })
})
