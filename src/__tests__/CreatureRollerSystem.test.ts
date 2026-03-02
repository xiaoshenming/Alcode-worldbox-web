import { describe, it, expect, beforeEach } from 'vitest'
import { CreatureRollerSystem } from '../systems/CreatureRollerSystem'
import type { Roller } from '../systems/CreatureRollerSystem'

let nextId = 1
function makeSys(): CreatureRollerSystem { return new CreatureRollerSystem() }
function makeRoller(entityId: number, overrides: Partial<Roller> = {}): Roller {
  return {
    id: nextId++,
    entityId,
    rollingSkill: 70,
    pressureControl: 65,
    thicknessAccuracy: 80,
    surfaceFinish: 75,
    tick: 0,
    ...overrides,
  }
}

const fakeEm = {
  getEntitiesWithComponents: () => [],
  getComponent: () => null,
} as any

describe('CreatureRollerSystem - 基础状态', () => {
  let sys: CreatureRollerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无轧钢工', () => { expect((sys as any).rollers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).rollers.push(makeRoller(1))
    expect((sys as any).rollers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).rollers.push(makeRoller(1))
    expect((sys as any).rollers).toBe((sys as any).rollers)
  })
  it('字段正确', () => {
    ;(sys as any).rollers.push(makeRoller(2))
    const r = (sys as any).rollers[0]
    expect(r.rollingSkill).toBe(70)
    expect(r.thicknessAccuracy).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).rollers.push(makeRoller(1))
    ;(sys as any).rollers.push(makeRoller(2))
    expect((sys as any).rollers).toHaveLength(2)
  })
})

describe('CreatureRollerSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureRollerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 不足 CHECK_INTERVAL(2810) 时 update 不执行技能增长', () => {
    ;(sys as any).rollers.push(makeRoller(1, { rollingSkill: 50 }))
    sys.update(1, fakeEm, 100)   // 100 < 2810
    expect((sys as any).rollers[0].rollingSkill).toBe(50)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时执行技能增长', () => {
    ;(sys as any).rollers.push(makeRoller(1, { rollingSkill: 50 }))
    sys.update(1, fakeEm, 2810)
    expect((sys as any).rollers[0].rollingSkill).toBeGreaterThan(50)
  })

  it('第一次 update 后 lastCheck 被更新为当前 tick', () => {
    sys.update(1, fakeEm, 2810)
    expect((sys as any).lastCheck).toBe(2810)
  })

  it('连续两次 update 间隔不足时第二次跳过', () => {
    ;(sys as any).rollers.push(makeRoller(1, { rollingSkill: 50 }))
    sys.update(1, fakeEm, 2810)
    const afterFirst = (sys as any).rollers[0].rollingSkill
    sys.update(1, fakeEm, 3000)  // 3000 - 2810 = 190 < 2810
    expect((sys as any).rollers[0].rollingSkill).toBe(afterFirst)
  })

  it('两次 update 间隔满足 CHECK_INTERVAL 时均执行', () => {
    ;(sys as any).rollers.push(makeRoller(1, { rollingSkill: 50 }))
    sys.update(1, fakeEm, 2810)
    const afterFirst = (sys as any).rollers[0].rollingSkill
    sys.update(1, fakeEm, 5620)  // 5620 - 2810 = 2810
    expect((sys as any).rollers[0].rollingSkill).toBeGreaterThan(afterFirst)
  })
})

describe('CreatureRollerSystem - 技能增长', () => {
  let sys: CreatureRollerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('rollingSkill 每次 update 增加 0.02', () => {
    ;(sys as any).rollers.push(makeRoller(1, { rollingSkill: 50 }))
    sys.update(1, fakeEm, 2810)
    expect((sys as any).rollers[0].rollingSkill).toBeCloseTo(50.02, 5)
  })

  it('pressureControl 每次 update 增加 0.015', () => {
    ;(sys as any).rollers.push(makeRoller(1, { pressureControl: 50 }))
    sys.update(1, fakeEm, 2810)
    expect((sys as any).rollers[0].pressureControl).toBeCloseTo(50.015, 5)
  })

  it('surfaceFinish 每次 update 增加 0.01', () => {
    ;(sys as any).rollers.push(makeRoller(1, { surfaceFinish: 50 }))
    sys.update(1, fakeEm, 2810)
    expect((sys as any).rollers[0].surfaceFinish).toBeCloseTo(50.01, 5)
  })

  it('rollingSkill 不超过 100 上限', () => {
    ;(sys as any).rollers.push(makeRoller(1, { rollingSkill: 100 }))
    sys.update(1, fakeEm, 2810)
    expect((sys as any).rollers[0].rollingSkill).toBe(100)
  })

  it('pressureControl 不超过 100 上限', () => {
    ;(sys as any).rollers.push(makeRoller(1, { pressureControl: 100 }))
    sys.update(1, fakeEm, 2810)
    expect((sys as any).rollers[0].pressureControl).toBe(100)
  })

  it('surfaceFinish 不超过 100 上限', () => {
    ;(sys as any).rollers.push(makeRoller(1, { surfaceFinish: 100 }))
    sys.update(1, fakeEm, 2810)
    expect((sys as any).rollers[0].surfaceFinish).toBe(100)
  })

  it('接近上限时精确截断：rollingSkill=99.99 增长后 = 100', () => {
    ;(sys as any).rollers.push(makeRoller(1, { rollingSkill: 99.99 }))
    sys.update(1, fakeEm, 2810)
    expect((sys as any).rollers[0].rollingSkill).toBe(100)
  })

  it('thicknessAccuracy 不参与增长（无源码中对应逻辑）', () => {
    ;(sys as any).rollers.push(makeRoller(1, { thicknessAccuracy: 80 }))
    sys.update(1, fakeEm, 2810)
    // thicknessAccuracy 没有增长逻辑，保持原值
    expect((sys as any).rollers[0].thicknessAccuracy).toBe(80)
  })
})

describe('CreatureRollerSystem - cleanup', () => {
  let sys: CreatureRollerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('rollingSkill 增长后仍 <= 4 时被移除（rollingSkill=3，增长后 3.02 <= 4）', () => {
    ;(sys as any).rollers.push(makeRoller(1, { rollingSkill: 3 }))
    sys.update(1, fakeEm, 2810)
    expect((sys as any).rollers).toHaveLength(0)
  })

  it('rollingSkill = 0 也被移除', () => {
    ;(sys as any).rollers.push(makeRoller(1, { rollingSkill: 0 }))
    sys.update(1, fakeEm, 2810)
    expect((sys as any).rollers).toHaveLength(0)
  })

  it('rollingSkill 在清除边界 3.98：update 后 3.98+0.02=4.00 仍被清除', () => {
    ;(sys as any).rollers.push(makeRoller(1, { rollingSkill: 3.98 }))
    sys.update(1, fakeEm, 2810)
    // 3.98 + 0.02 = 4.00, 条件 <= 4，仍触发
    expect((sys as any).rollers).toHaveLength(0)
  })

  it('rollingSkill > 4 的轧钢工被保留', () => {
    ;(sys as any).rollers.push(makeRoller(1, { rollingSkill: 5 }))
    sys.update(1, fakeEm, 2810)
    expect((sys as any).rollers).toHaveLength(1)
  })

  it('混合情况：低值被移除、高值被保留', () => {
    ;(sys as any).rollers.push(makeRoller(1, { rollingSkill: 3 }))
    ;(sys as any).rollers.push(makeRoller(2, { rollingSkill: 50 }))
    ;(sys as any).rollers.push(makeRoller(3, { rollingSkill: 1 }))
    sys.update(1, fakeEm, 2810)
    expect((sys as any).rollers).toHaveLength(1)
    expect((sys as any).rollers[0].entityId).toBe(2)
  })
})
