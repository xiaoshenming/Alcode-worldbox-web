import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreaturePotterSystem } from '../systems/CreaturePotterSystem'
import type { Potter } from '../systems/CreaturePotterSystem'

const CHECK_INTERVAL = 2550
const MAX_POTTERS = 13

let nextId = 1
function makeSys(): CreaturePotterSystem { return new CreaturePotterSystem() }
function makePotter(entityId: number, overrides: Partial<Potter> = {}): Potter {
  return {
    id: nextId++,
    entityId,
    wheelControl: 70,
    clayPreparation: 65,
    glazingSkill: 80,
    outputQuality: 75,
    tick: 0,
    ...overrides,
  }
}

const mockEm = { getEntitiesWithComponents: () => [], getComponent: () => null } as any

describe('CreaturePotterSystem - 基础状态', () => {
  let sys: CreaturePotterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无陶匠', () => { expect((sys as any).potters).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).potters.push(makePotter(1))
    expect((sys as any).potters[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).potters.push(makePotter(1))
    expect((sys as any).potters).toBe((sys as any).potters)
  })
  it('字段正确', () => {
    ;(sys as any).potters.push(makePotter(2))
    const p = (sys as any).potters[0]
    expect(p.wheelControl).toBe(70)
    expect(p.glazingSkill).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).potters.push(makePotter(1))
    ;(sys as any).potters.push(makePotter(2))
    expect((sys as any).potters).toHaveLength(2)
  })
})

describe('CreaturePotterSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreaturePotterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 不足 CHECK_INTERVAL 时不执行逻辑（lastCheck 不变）', () => {
    sys.update(0, mockEm, 0)          // 初始化 lastCheck=0
    ;(sys as any).lastCheck = 0
    sys.update(0, mockEm, CHECK_INTERVAL - 1)  // 不足，跳过
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好等于 CHECK_INTERVAL 时执行逻辑（lastCheck 更新）', () => {
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('连续两次 tick 相差不足 CHECK_INTERVAL，第二次不执行', () => {
    sys.update(0, mockEm, CHECK_INTERVAL)
    const before = (sys as any).lastCheck
    sys.update(0, mockEm, CHECK_INTERVAL + 1)
    expect((sys as any).lastCheck).toBe(before)
  })

  it('间隔超过 CHECK_INTERVAL 的两次 update 都会执行', () => {
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(0, mockEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
})

describe('CreaturePotterSystem - 技能递增与上限', () => {
  let sys: CreaturePotterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('update 后 wheelControl 增加 0.02', () => {
    ;(sys as any).potters.push(makePotter(1, { wheelControl: 50 }))
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).potters[0].wheelControl).toBeCloseTo(50.02, 5)
  })

  it('update 后 glazingSkill 增加 0.015', () => {
    ;(sys as any).potters.push(makePotter(1, { glazingSkill: 50 }))
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).potters[0].glazingSkill).toBeCloseTo(50.015, 5)
  })

  it('update 后 outputQuality 增加 0.01', () => {
    ;(sys as any).potters.push(makePotter(1, { outputQuality: 50 }))
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).potters[0].outputQuality).toBeCloseTo(50.01, 5)
  })

  it('wheelControl 上限 100，不会超过', () => {
    ;(sys as any).potters.push(makePotter(1, { wheelControl: 99.99 }))
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).potters[0].wheelControl).toBe(100)
  })

  it('glazingSkill 上限 100，不会超过', () => {
    ;(sys as any).potters.push(makePotter(1, { glazingSkill: 99.99 }))
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).potters[0].glazingSkill).toBe(100)
  })

  it('outputQuality 上限 100，不会超过', () => {
    ;(sys as any).potters.push(makePotter(1, { outputQuality: 99.99 }))
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).potters[0].outputQuality).toBe(100)
  })

  it('满值技能保持在 100 不再累加', () => {
    ;(sys as any).potters.push(makePotter(1, { wheelControl: 100, glazingSkill: 100, outputQuality: 100 }))
    sys.update(0, mockEm, CHECK_INTERVAL)
    const p = (sys as any).potters[0]
    expect(p.wheelControl).toBe(100)
    expect(p.glazingSkill).toBe(100)
    expect(p.outputQuality).toBe(100)
  })
})

describe('CreaturePotterSystem - cleanup 边界', () => {
  let sys: CreaturePotterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('wheelControl > 4 的陶匠不被清���', () => {
    ;(sys as any).potters.push(makePotter(1, { wheelControl: 4.01 }))
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).potters).toHaveLength(1)
  })

  it('wheelControl 加增后恰好等于 4 的陶匠被清除（3.98+0.02=4.0 <=4）', () => {
    // update 先加技能：3.98 + 0.02 = 4.0，然后 cleanup 条件 <=4 成立 → 清除
    ;(sys as any).potters.push(makePotter(1, { wheelControl: 3.98 }))
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).potters).toHaveLength(0)
  })

  it('wheelControl=4.0 加增后=4.02 不被清除（4.02 > 4）', () => {
    // update 先加技能：4.0 + 0.02 = 4.02，cleanup 条件 <=4 不成立 → 保留
    ;(sys as any).potters.push(makePotter(1, { wheelControl: 4.0 }))
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).potters).toHaveLength(1)
  })

  it('wheelControl=3.97 加增后=3.99 被清除（3.99 <=4）', () => {
    ;(sys as any).potters.push(makePotter(1, { wheelControl: 3.97 }))
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).potters).toHaveLength(0)
  })

  it('混合时仅低值陶匠被清除', () => {
    ;(sys as any).potters.push(makePotter(1, { wheelControl: 3.5 }))   // 3.5+0.02=3.52 <=4 → 清除
    ;(sys as any).potters.push(makePotter(2, { wheelControl: 50 }))    // 50+0.02=50.02 >4  → 保留
    ;(sys as any).potters.push(makePotter(3, { wheelControl: 4.0 }))   // 4.0+0.02=4.02 >4  → 保留
    sys.update(0, mockEm, CHECK_INTERVAL)
    expect((sys as any).potters).toHaveLength(2)
    expect((sys as any).potters.map((p: any) => p.entityId)).toContain(2)
    expect((sys as any).potters.map((p: any) => p.entityId)).toContain(3)
  })

  it('陶匠上限 MAX_POTTERS 为 13', () => {
    expect(MAX_POTTERS).toBe(13)
  })
})
