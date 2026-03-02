import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureHonerSystem } from '../systems/CreatureHonerSystem'
import type { Honer } from '../systems/CreatureHonerSystem'

let nextId = 1
function makeSys(): CreatureHonerSystem { return new CreatureHonerSystem() }
function makeHoner(entityId: number, overrides: Partial<Honer> = {}): Honer {
  return {
    id: nextId++, entityId,
    honingSkill: 70, abrasiveControl: 65,
    surfacePrecision: 80, crosshatchAngle: 45,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureHonerSystem', () => {
  let sys: CreatureHonerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  // --- 基础数据测试 ---
  it('初始无磨刀工', () => {
    expect((sys as any).honers).toHaveLength(0)
  })

  it('注入后可查询', () => {
    ;(sys as any).honers.push(makeHoner(1))
    expect((sys as any).honers[0].entityId).toBe(1)
  })

  it('多个磨刀工全部返回', () => {
    ;(sys as any).honers.push(makeHoner(1))
    ;(sys as any).honers.push(makeHoner(2))
    ;(sys as any).honers.push(makeHoner(3))
    expect((sys as any).honers).toHaveLength(3)
  })

  it('Honer 对象包含四个核心技能字段', () => {
    ;(sys as any).honers.push(makeHoner(5))
    const h = (sys as any).honers[0]
    expect(h).toHaveProperty('honingSkill')
    expect(h).toHaveProperty('abrasiveControl')
    expect(h).toHaveProperty('surfacePrecision')
    expect(h).toHaveProperty('crosshatchAngle')
  })

  it('注入字段值正确存储', () => {
    ;(sys as any).honers.push(makeHoner(5))
    const h = (sys as any).honers[0]
    expect(h.honingSkill).toBe(70)
    expect(h.surfacePrecision).toBe(80)
    expect(h.abrasiveControl).toBe(65)
    expect(h.crosshatchAngle).toBe(45)
  })

  // --- tick 间隔控制测试（CHECK_INTERVAL = 2960）---
  it('tick 差值 < 2960 时不触发更新（lastCheck 不变）', () => {
    const em = {} as any
    sys.update(0, em, 0)      // 初始化 lastCheck = 0
    const before = (sys as any).lastCheck
    sys.update(0, em, 2959)   // 差值 2959 < 2960，不更新
    expect((sys as any).lastCheck).toBe(before)
  })

  it('tick 差值 >= 2960 时触发更新（lastCheck 变为当前 tick）', () => {
    const em = {} as any
    sys.update(0, em, 0)
    sys.update(0, em, 2960)
    expect((sys as any).lastCheck).toBe(2960)
  })

  // --- 技能递增：honingSkill+0.02 ---
  it('update 后 honingSkill 每次增加 0.02', () => {
    const h = makeHoner(1, { honingSkill: 50 })
    ;(sys as any).honers.push(h)
    ;(sys as any).lastCheck = -2960
    const em = {} as any
    sys.update(0, em, 0)
    expect((sys as any).honers[0].honingSkill).toBeCloseTo(50.02, 5)
  })

  // --- 技能递增：abrasiveControl+0.015 ---
  it('update 后 abrasiveControl 每次增加 0.015', () => {
    const h = makeHoner(1, { abrasiveControl: 40 })
    ;(sys as any).honers.push(h)
    ;(sys as any).lastCheck = -2960
    const em = {} as any
    sys.update(0, em, 0)
    expect((sys as any).honers[0].abrasiveControl).toBeCloseTo(40.015, 5)
  })

  // --- 技能递增：crosshatchAngle+0.01 ---
  it('update 后 crosshatchAngle 每次增加 0.01', () => {
    const h = makeHoner(1, { crosshatchAngle: 30 })
    ;(sys as any).honers.push(h)
    ;(sys as any).lastCheck = -2960
    const em = {} as any
    sys.update(0, em, 0)
    expect((sys as any).honers[0].crosshatchAngle).toBeCloseTo(30.01, 5)
  })

  // --- honingSkill 上限 100 ---
  it('honingSkill 上���为 100，不超过', () => {
    const h = makeHoner(1, { honingSkill: 99.99 })
    ;(sys as any).honers.push(h)
    ;(sys as any).lastCheck = -2960
    const em = {} as any
    sys.update(0, em, 0)
    expect((sys as any).honers[0].honingSkill).toBe(100)
  })

  // --- cleanup 边界：honingSkill <= 4 时删除 ---
  it('cleanup: honingSkill <= 4 时磨刀工被删除', () => {
    // 注入 honingSkill=4 的磨刀工（先递增 +0.02 = 4.02，但已经 <= 4 则在递增前就 <= 4 不适用）
    // 实际源码：先递增后cleanup；所以注入 honingSkill=3.98 => 递增后 4.00，仍 <= 4，被删除
    const h = makeHoner(1, { honingSkill: 3.98 })
    ;(sys as any).honers.push(h)
    ;(sys as any).lastCheck = -2960
    const em = {} as any
    sys.update(0, em, 0)
    // 递增后 honingSkill = 4.00，cleanup条件 <= 4 成立，被删除
    expect((sys as any).honers).toHaveLength(0)
  })

  it('cleanup: honingSkill 刚超过 4 时不被删除', () => {
    // 注入 honingSkill=4.00 => 递增后 4.02，> 4，不删除
    const h = makeHoner(1, { honingSkill: 4.00 })
    ;(sys as any).honers.push(h)
    ;(sys as any).lastCheck = -2960
    const em = {} as any
    sys.update(0, em, 0)
    // 递增后 honingSkill = 4.02，> 4，不删除
    expect((sys as any).honers).toHaveLength(1)
    expect((sys as any).honers[0].honingSkill).toBeCloseTo(4.02, 5)
  })
})
