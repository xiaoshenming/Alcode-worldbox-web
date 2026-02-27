import { describe, it, expect, beforeEach } from 'vitest'
import { BloodMoonSystem } from '../systems/BloodMoonSystem'

// BloodMoonSystem 测试：
// 所有方法都是基于内部状态的纯计算（无外部依赖）。
// 通过 as any 注入私有字段精确控制 elapsed/active/rainSeed 等状态。
//
// Phase 时序（总 300 ticks）：
//   rising   elapsed 0~59   (RISING_TICKS=60)
//   peak     elapsed 60~239 (PEAK_TICKS=180)
//   waning   elapsed 240~299 (WANING_TICKS=60)

function makeBMS(): BloodMoonSystem {
  return new BloodMoonSystem()
}

function activateAtElapsed(bms: BloodMoonSystem, elapsed: number): void {
  ;(bms as any).active = true
  ;(bms as any).elapsed = elapsed
  ;(bms as any).rainSeed = 0
}

// ── isActive ──────────────────────────────────────────────────────────────────

describe('BloodMoonSystem.isActive', () => {
  let bms: BloodMoonSystem

  beforeEach(() => {
    bms = makeBMS()
  })

  it('初始状态 isActive() 返回 false', () => {
    expect(bms.isActive()).toBe(false)
  })

  it('激活后 isActive() 返回 true', () => {
    activateAtElapsed(bms, 0)
    expect(bms.isActive()).toBe(true)
  })
})

// ── getPhase ──────────────────────────────────────────────────────────────────

describe('BloodMoonSystem.getPhase', () => {
  let bms: BloodMoonSystem

  beforeEach(() => {
    bms = makeBMS()
  })

  it('未激活时 getPhase() 返回 "none"', () => {
    expect(bms.getPhase()).toBe('none')
  })

  it('elapsed < 60 时为 rising 阶段', () => {
    activateAtElapsed(bms, 0)
    expect(bms.getPhase()).toBe('rising')
    activateAtElapsed(bms, 59)
    expect(bms.getPhase()).toBe('rising')
  })

  it('elapsed = 60 时进入 peak 阶段', () => {
    activateAtElapsed(bms, 60)
    expect(bms.getPhase()).toBe('peak')
  })

  it('elapsed = 239 时仍在 peak 阶段', () => {
    activateAtElapsed(bms, 239)
    expect(bms.getPhase()).toBe('peak')
  })

  it('elapsed = 240 时进入 waning 阶段', () => {
    activateAtElapsed(bms, 240)
    expect(bms.getPhase()).toBe('waning')
  })

  it('elapsed = 299 时仍在 waning 阶段', () => {
    activateAtElapsed(bms, 299)
    expect(bms.getPhase()).toBe('waning')
  })
})

// ── getIntensity ──────────────────────────────────────────────────────────────

describe('BloodMoonSystem.getIntensity', () => {
  let bms: BloodMoonSystem

  beforeEach(() => {
    bms = makeBMS()
  })

  it('未激活时强度为 0', () => {
    expect(bms.getIntensity()).toBe(0)
  })

  it('rising 阶段开始时强度接近 0', () => {
    activateAtElapsed(bms, 0)
    expect(bms.getIntensity()).toBeCloseTo(0)
  })

  it('rising 阶段 elapsed=30 时强度为 0.5', () => {
    activateAtElapsed(bms, 30)
    expect(bms.getIntensity()).toBeCloseTo(0.5)
  })

  it('peak 阶段强度为 1', () => {
    activateAtElapsed(bms, 60)
    expect(bms.getIntensity()).toBe(1)
    activateAtElapsed(bms, 150)
    expect(bms.getIntensity()).toBe(1)
  })

  it('waning 阶段强度从 1 递减到 0', () => {
    activateAtElapsed(bms, 240)
    expect(bms.getIntensity()).toBeCloseTo(1) // 刚开始 waning
    activateAtElapsed(bms, 270)
    expect(bms.getIntensity()).toBeCloseTo(0.5) // 中间
    activateAtElapsed(bms, 299)
    // elapsed-240=59, intensity=1-59/60≈0.017
    expect(bms.getIntensity()).toBeGreaterThan(0)
    expect(bms.getIntensity()).toBeLessThan(1)
  })

  it('强度值始终在 0~1 之间', () => {
    for (let elapsed = 0; elapsed < 300; elapsed++) {
      activateAtElapsed(bms, elapsed)
      const v = bms.getIntensity()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})

// ── getCombatModifier ─────────────────────────────────────────────────────────

describe('BloodMoonSystem.getCombatModifier', () => {
  let bms: BloodMoonSystem

  beforeEach(() => {
    bms = makeBMS()
  })

  it('未激活时返回 1.0', () => {
    expect(bms.getCombatModifier()).toBe(1.0)
  })

  it('peak 阶段返回 ATTACK_BONUS（1.5）', () => {
    activateAtElapsed(bms, 120)  // peak
    expect(bms.getCombatModifier()).toBeCloseTo(1.5)
  })

  it('rising 初始时接近 1.0', () => {
    activateAtElapsed(bms, 0)
    expect(bms.getCombatModifier()).toBeCloseTo(1.0, 1)
  })

  it('值始终 >= 1.0', () => {
    for (let elapsed = 0; elapsed < 300; elapsed++) {
      activateAtElapsed(bms, elapsed)
      expect(bms.getCombatModifier()).toBeGreaterThanOrEqual(1.0)
    }
  })
})

// ── getSpawnRateModifier ──────────────────────────────────────────────────────

describe('BloodMoonSystem.getSpawnRateModifier', () => {
  let bms: BloodMoonSystem

  beforeEach(() => {
    bms = makeBMS()
  })

  it('未激活时返回 1.0', () => {
    expect(bms.getSpawnRateModifier()).toBe(1.0)
  })

  it('peak 阶段返回 SPAWN_RATE_MULTIPLIER（3.0）', () => {
    activateAtElapsed(bms, 120)  // peak
    expect(bms.getSpawnRateModifier()).toBeCloseTo(3.0)
  })

  it('值始终在 1.0~3.0 之间', () => {
    for (let elapsed = 0; elapsed < 300; elapsed++) {
      activateAtElapsed(bms, elapsed)
      const v = bms.getSpawnRateModifier()
      expect(v).toBeGreaterThanOrEqual(1.0)
      expect(v).toBeLessThanOrEqual(3.0 + 0.001) // 浮点容差
    }
  })
})

// ── getSpeedModifier ──────────────────────────────────────────────────────────

describe('BloodMoonSystem.getSpeedModifier', () => {
  let bms: BloodMoonSystem

  beforeEach(() => {
    bms = makeBMS()
  })

  it('未激活时返回 1.0', () => {
    expect(bms.getSpeedModifier()).toBe(1.0)
  })

  it('peak 阶段返回 SPEED_BONUS（1.3）', () => {
    activateAtElapsed(bms, 120)
    expect(bms.getSpeedModifier()).toBeCloseTo(1.3)
  })
})

// ── getOverlayColor ───────────────────────────────────────────────────────────

describe('BloodMoonSystem.getOverlayColor', () => {
  let bms: BloodMoonSystem

  beforeEach(() => {
    bms = makeBMS()
  })

  it('未激活时 alpha 为 0', () => {
    const color = bms.getOverlayColor()
    expect(color.a).toBe(0)
  })

  it('peak 阶段 r=180, g=20, b=20', () => {
    activateAtElapsed(bms, 120)
    const color = bms.getOverlayColor()
    expect(color.r).toBe(180)
    expect(color.g).toBe(20)
    expect(color.b).toBe(20)
  })

  it('peak 阶段 alpha 接近 0.18', () => {
    activateAtElapsed(bms, 120)
    const color = bms.getOverlayColor()
    expect(color.a).toBeCloseTo(0.18)
  })
})

// ── getBloodRainPositions ─────────────────────────────────────────────────────

describe('BloodMoonSystem.getBloodRainPositions', () => {
  let bms: BloodMoonSystem

  beforeEach(() => {
    bms = makeBMS()
  })

  it('未激活时返回空数组', () => {
    expect(bms.getBloodRainPositions(0, 0, 100, 100)).toHaveLength(0)
  })

  it('peak 阶段返回正粒子数（约 12 个）', () => {
    activateAtElapsed(bms, 120)
    const positions = bms.getBloodRainPositions(0, 0, 200, 200)
    expect(positions.length).toBeGreaterThan(0)
    expect(positions.length).toBeLessThanOrEqual(12)
  })

  it('返回的位置在视口范围内', () => {
    activateAtElapsed(bms, 120)
    const vx = 10, vy = 20, vw = 100, vh = 80
    const positions = bms.getBloodRainPositions(vx, vy, vw, vh)
    for (const p of positions) {
      expect(p.x).toBeGreaterThanOrEqual(vx)
      expect(p.x).toBeLessThanOrEqual(vx + vw)
      expect(p.y).toBeGreaterThanOrEqual(vy)
      expect(p.y).toBeLessThanOrEqual(vy + vh)
    }
  })

  it('rising 初始时粒子数为 0（intensity=0）', () => {
    activateAtElapsed(bms, 0)
    const positions = bms.getBloodRainPositions(0, 0, 200, 200)
    expect(positions.length).toBe(0)
  })
})

// ── update 状态机推进 ──────────────────────────────────────────────────────────

describe('BloodMoonSystem.update', () => {
  it('手动推进 cooldown 触发激活', () => {
    const bms = makeBMS()
    // 强制设置 cooldown 为 1，ticksSinceLastMoon 为 0
    ;(bms as any).cooldown = 1
    ;(bms as any).ticksSinceLastMoon = 0
    ;(bms as any).active = false

    bms.update(1)  // ticksSinceLastMoon 变为 1 >= cooldown=1，触发激活
    expect(bms.isActive()).toBe(true)
  })

  it('激活后推进 300 tick 自动结束', () => {
    const bms = makeBMS()
    activateAtElapsed(bms, 0)
    for (let i = 0; i < 300; i++) {
      bms.update(i)
    }
    expect(bms.isActive()).toBe(false)
  })
})
