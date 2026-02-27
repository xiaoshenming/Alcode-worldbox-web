import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureAgingSystem } from '../systems/CreatureAgingSystem'
import type { LifeStage, ColorTint } from '../systems/CreatureAgingSystem'

// CreatureAgingSystem 测试:
// - getLifeStage(eid)        → 未注册返回 'ADULT'，注入后返回对应阶段
// - getSizeMultiplier(eid)   → 基于生命阶段返回 size 乘数
// - getSpeedMultiplier(eid)  → 基于生命阶段返回 speed 乘数
// - getCombatMultiplier(eid) → 基于生命阶段返回 combat 乘数
// - getColorTint(eid)        → 基于生命阶段返回 RGB 色调
// - getWisdomBonus(eid)      → 基于生命阶段返回智慧加成
// 通过 as any 注入 stageCache Map 进行测试。
// 生命阶段规则: BABY(0-5), CHILD(5-15), ADULT(15-60), ELDER(60-90), ANCIENT(90+)

function makeCAS(): CreatureAgingSystem {
  return new CreatureAgingSystem()
}

// 注入阶段到 stageCache
function injectStage(cas: CreatureAgingSystem, eid: number, stage: LifeStage): void {
  ;(cas as any).stageCache.set(eid, stage)
}

describe('CreatureAgingSystem.getLifeStage', () => {
  let cas: CreatureAgingSystem

  beforeEach(() => { cas = makeCAS() })

  it('未注册实体返回默认 ADULT', () => {
    expect(cas.getLifeStage(1)).toBe('ADULT')
    expect(cas.getLifeStage(999)).toBe('ADULT')
  })

  it('注入 BABY 后正确返回', () => {
    injectStage(cas, 1, 'BABY')
    expect(cas.getLifeStage(1)).toBe('BABY')
  })

  it('注入 CHILD 后正确返回', () => {
    injectStage(cas, 2, 'CHILD')
    expect(cas.getLifeStage(2)).toBe('CHILD')
  })

  it('注入 ELDER 后正确返回', () => {
    injectStage(cas, 3, 'ELDER')
    expect(cas.getLifeStage(3)).toBe('ELDER')
  })

  it('注入 ANCIENT 后正确返回', () => {
    injectStage(cas, 4, 'ANCIENT')
    expect(cas.getLifeStage(4)).toBe('ANCIENT')
  })

  it('不同实体阶段独立存储', () => {
    injectStage(cas, 1, 'BABY')
    injectStage(cas, 2, 'ANCIENT')
    expect(cas.getLifeStage(1)).toBe('BABY')
    expect(cas.getLifeStage(2)).toBe('ANCIENT')
    expect(cas.getLifeStage(3)).toBe('ADULT')  // 未注册
  })
})

describe('CreatureAgingSystem.getSizeMultiplier', () => {
  let cas: CreatureAgingSystem

  beforeEach(() => { cas = makeCAS() })

  it('未注册实体(ADULT)返回 1.0', () => {
    expect(cas.getSizeMultiplier(1)).toBe(1.0)
  })

  it('BABY 返回 0.5', () => {
    injectStage(cas, 1, 'BABY')
    expect(cas.getSizeMultiplier(1)).toBe(0.5)
  })

  it('CHILD 返回 0.7', () => {
    injectStage(cas, 1, 'CHILD')
    expect(cas.getSizeMultiplier(1)).toBe(0.7)
  })

  it('ELDER 返回 0.9', () => {
    injectStage(cas, 1, 'ELDER')
    expect(cas.getSizeMultiplier(1)).toBe(0.9)
  })

  it('ANCIENT 返回 0.85', () => {
    injectStage(cas, 1, 'ANCIENT')
    expect(cas.getSizeMultiplier(1)).toBe(0.85)
  })
})

describe('CreatureAgingSystem.getSpeedMultiplier', () => {
  let cas: CreatureAgingSystem

  beforeEach(() => { cas = makeCAS() })

  it('ADULT 速度为 1.0', () => {
    expect(cas.getSpeedMultiplier(1)).toBe(1.0)
  })

  it('BABY 速度为 0.6', () => {
    injectStage(cas, 1, 'BABY')
    expect(cas.getSpeedMultiplier(1)).toBe(0.6)
  })

  it('CHILD 速度为 0.9', () => {
    injectStage(cas, 1, 'CHILD')
    expect(cas.getSpeedMultiplier(1)).toBe(0.9)
  })

  it('ELDER 速度为 0.7', () => {
    injectStage(cas, 1, 'ELDER')
    expect(cas.getSpeedMultiplier(1)).toBe(0.7)
  })

  it('ANCIENT 速度为 0.5 (最慢)', () => {
    injectStage(cas, 1, 'ANCIENT')
    expect(cas.getSpeedMultiplier(1)).toBe(0.5)
  })
})

describe('CreatureAgingSystem.getCombatMultiplier', () => {
  let cas: CreatureAgingSystem

  beforeEach(() => { cas = makeCAS() })

  it('ADULT 战斗力为 1.0 (最强)', () => {
    expect(cas.getCombatMultiplier(1)).toBe(1.0)
  })

  it('BABY 战斗力为 0.1 (最弱)', () => {
    injectStage(cas, 1, 'BABY')
    expect(cas.getCombatMultiplier(1)).toBe(0.1)
  })

  it('CHILD 战斗力为 0.4', () => {
    injectStage(cas, 1, 'CHILD')
    expect(cas.getCombatMultiplier(1)).toBe(0.4)
  })

  it('ELDER 战斗力为 0.8', () => {
    injectStage(cas, 1, 'ELDER')
    expect(cas.getCombatMultiplier(1)).toBe(0.8)
  })

  it('ANCIENT 战斗力为 0.6', () => {
    injectStage(cas, 1, 'ANCIENT')
    expect(cas.getCombatMultiplier(1)).toBe(0.6)
  })
})

describe('CreatureAgingSystem.getColorTint', () => {
  let cas: CreatureAgingSystem

  beforeEach(() => { cas = makeCAS() })

  it('ADULT 色调全为 0 (无变化)', () => {
    const tint: ColorTint = cas.getColorTint(1)
    expect(tint.r).toBe(0)
    expect(tint.g).toBe(0)
    expect(tint.b).toBe(0)
  })

  it('BABY 色调 r=30, g=30, b=30 (偏亮)', () => {
    injectStage(cas, 1, 'BABY')
    const tint: ColorTint = cas.getColorTint(1)
    expect(tint.r).toBe(30)
    expect(tint.g).toBe(30)
    expect(tint.b).toBe(30)
  })

  it('ANCIENT 色调 r=-30, g=-30, b=-10 (偏暗)', () => {
    injectStage(cas, 1, 'ANCIENT')
    const tint: ColorTint = cas.getColorTint(1)
    expect(tint.r).toBe(-30)
    expect(tint.g).toBe(-30)
    expect(tint.b).toBe(-10)
  })

  it('ELDER 色调 r=-15, g=-15, b=-5', () => {
    injectStage(cas, 1, 'ELDER')
    const tint: ColorTint = cas.getColorTint(1)
    expect(tint.r).toBe(-15)
    expect(tint.g).toBe(-15)
    expect(tint.b).toBe(-5)
  })
})

describe('CreatureAgingSystem.getWisdomBonus', () => {
  let cas: CreatureAgingSystem

  beforeEach(() => { cas = makeCAS() })

  it('BABY 智慧为 0', () => {
    injectStage(cas, 1, 'BABY')
    expect(cas.getWisdomBonus(1)).toBe(0)
  })

  it('CHILD 智慧为 0', () => {
    injectStage(cas, 1, 'CHILD')
    expect(cas.getWisdomBonus(1)).toBe(0)
  })

  it('ADULT 智慧为 0.1', () => {
    expect(cas.getWisdomBonus(1)).toBe(0.1)
  })

  it('ELDER 智慧为 0.3', () => {
    injectStage(cas, 1, 'ELDER')
    expect(cas.getWisdomBonus(1)).toBe(0.3)
  })

  it('ANCIENT 智慧为 0.5 (最高)', () => {
    injectStage(cas, 1, 'ANCIENT')
    expect(cas.getWisdomBonus(1)).toBe(0.5)
  })
})
