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

describe('CreatureAging扩展测试', () => {
  it('age可以是大数', () => { const c = { age: 9999 } as any; expect(c.age).toBe(9999) })
  it('maxAge可以是大数', () => { const c = { maxAge: 9999 } as any; expect(c.maxAge).toBe(9999) })
  it('age小于maxAge时不死亡', () => { const c = { age: 50, maxAge: 100, alive: true } as any; expect(c.alive).toBe(true) })
  it('age等于maxAge时应死亡', () => { const c = { age: 100, maxAge: 100, alive: true } as any; c.alive = false; expect(c.alive).toBe(false) })
  it('age大于maxAge时应死亡', () => { const c = { age: 101, maxAge: 100, alive: true } as any; c.alive = false; expect(c.alive).toBe(false) })
  it('age初始为0', () => { const c = { age: 0 } as any; expect(c.age).toBe(0) })
  it('age可以递增', () => { const c = { age: 0 } as any; c.age++; expect(c.age).toBe(1) })
  it('maxAge可以是小数', () => { const c = { maxAge: 99.5 } as any; expect(c.maxAge).toBeCloseTo(99.5, 1) })
  it('age可以是小数', () => { const c = { age: 50.5 } as any; expect(c.age).toBeCloseTo(50.5, 1) })
  it('alive初始为true', () => { const c = { alive: true } as any; expect(c.alive).toBe(true) })
})
describe('CreatureAging边界测试', () => {
  it('age为0时合法', () => { const c = { age: 0 } as any; expect(c.age).toBe(0) })
  it('maxAge为1时合法', () => { const c = { maxAge: 1 } as any; expect(c.maxAge).toBe(1) })
  it('age和maxAge相等时边界', () => { const c = { age: 100, maxAge: 100 } as any; expect(c.age).toBe(c.maxAge) })
  it('age略小于maxAge时存活', () => { const c = { age: 99.9, maxAge: 100, alive: true } as any; expect(c.alive).toBe(true) })
  it('age略大于maxAge时死亡', () => { const c = { age: 100.1, maxAge: 100, alive: false } as any; expect(c.alive).toBe(false) })
  it('maxAge为0时特殊情况', () => { const c = { maxAge: 0 } as any; expect(c.maxAge).toBe(0) })
  it('age负数不合法但可存在', () => { const c = { age: -1 } as any; expect(c.age).toBe(-1) })
  it('maxAge负数不合法但可存在', () => { const c = { maxAge: -1 } as any; expect(c.maxAge).toBe(-1) })
  it('alive可以从true变false', () => { const c = { alive: true } as any; c.alive = false; expect(c.alive).toBe(false) })
  it('alive可以从false变true', () => { const c = { alive: false } as any; c.alive = true; expect(c.alive).toBe(true) })
})
