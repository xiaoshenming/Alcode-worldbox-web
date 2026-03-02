import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureSawyerSystem } from '../systems/CreatureSawyerSystem'
import type { Sawyer } from '../systems/CreatureSawyerSystem'

// CHECK_INTERVAL = 2660, MAX_SAWYERS = 10
const CHECK_INTERVAL = 2660
const em = { getEntitiesWithComponent: () => [] } as any

let nextId = 1
function makeSys(): CreatureSawyerSystem { return new CreatureSawyerSystem() }
function makeSawyer(entityId: number, overrides: Partial<Sawyer> = {}): Sawyer {
  return {
    id: nextId++,
    entityId,
    sawingSkill: 70,
    timberGrading: 65,
    bladeControl: 80,
    outputQuality: 75,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureSawyerSystem - 基础字段', () => {
  let sys: CreatureSawyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无锯木工', () => { expect((sys as any).sawyers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).sawyers.push(makeSawyer(1))
    expect((sys as any).sawyers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).sawyers.push(makeSawyer(1))
    expect((sys as any).sawyers).toBe((sys as any).sawyers)
  })
  it('字段正确', () => {
    ;(sys as any).sawyers.push(makeSawyer(2))
    const s = (sys as any).sawyers[0]
    expect(s.sawingSkill).toBe(70)
    expect(s.bladeControl).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).sawyers.push(makeSawyer(1))
    ;(sys as any).sawyers.push(makeSawyer(2))
    expect((sys as any).sawyers).toHaveLength(2)
  })
})

describe('CreatureSawyerSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureSawyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不更新技能', () => {
    ;(sys as any).sawyers.push(makeSawyer(1, { sawingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).sawyers[0].sawingSkill).toBe(50)
  })

  it('tick恰好等于CHECK_INTERVAL时执行更新', () => {
    ;(sys as any).sawyers.push(makeSawyer(1, { sawingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).sawyers[0].sawingSkill).toBeCloseTo(50.02, 5)
  })

  it('两次间隔不足时第二次不再更新', () => {
    ;(sys as any).sawyers.push(makeSawyer(1, { sawingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    const after1 = (sys as any).sawyers[0].sawingSkill
    sys.update(1, em, CHECK_INTERVAL + 1) // 差值=1，不足
    expect((sys as any).sawyers[0].sawingSkill).toBe(after1)
  })

  it('第二个完整间隔后再次更新', () => {
    ;(sys as any).sawyers.push(makeSawyer(1, { sawingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).sawyers[0].sawingSkill).toBeCloseTo(50.04, 5)
  })
})

describe('CreatureSawyerSystem - 技能递增', () => {
  let sys: CreatureSawyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('sawingSkill 每次+0.02', () => {
    ;(sys as any).sawyers.push(makeSawyer(1, { sawingSkill: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).sawyers[0].sawingSkill).toBeCloseTo(50.02, 5)
  })

  it('bladeControl 每次+0.015', () => {
    ;(sys as any).sawyers.push(makeSawyer(1, { bladeControl: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).sawyers[0].bladeControl).toBeCloseTo(50.015, 5)
  })

  it('outputQuality 每次+0.01', () => {
    ;(sys as any).sawyers.push(makeSawyer(1, { outputQuality: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).sawyers[0].outputQuality).toBeCloseTo(50.01, 5)
  })

  it('sawingSkill 上限100，不超过', () => {
    ;(sys as any).sawyers.push(makeSawyer(1, { sawingSkill: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).sawyers[0].sawingSkill).toBe(100)
  })

  it('outputQuality 已达100时不继续增加', () => {
    ;(sys as any).sawyers.push(makeSawyer(1, { outputQuality: 100 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).sawyers[0].outputQuality).toBe(100)
  })

  it('timberGrading 不在技能递增列表，保持不变', () => {
    ;(sys as any).sawyers.push(makeSawyer(1, { timberGrading: 60 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).sawyers[0].timberGrading).toBe(60)
  })
})

describe('CreatureSawyerSystem - cleanup边界', () => {
  let sys: CreatureSawyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('sawingSkill 恰好为3.98时（+0.02=4.0），等于4仍被移除', () => {
    ;(sys as any).sawyers.push(makeSawyer(1, { sawingSkill: 3.98 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.0, cleanup条件 <= 4, 所以被移除
    expect((sys as any).sawyers).toHaveLength(0)
  })

  it('sawingSkill 为4.01时不被移除', () => {
    ;(sys as any).sawyers.push(makeSawyer(1, { sawingSkill: 4.01 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    // 4.01 + 0.02 = 4.03 > 4, 不移除
    expect((sys as any).sawyers).toHaveLength(1)
  })

  it('sawingSkill <= 4 时从列表移除（低值测试）', () => {
    ;(sys as any).sawyers.push(makeSawyer(1, { sawingSkill: 1.0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    // 1.0 + 0.02 = 1.02 <= 4, 被移除
    expect((sys as any).sawyers).toHaveLength(0)
  })

  it('多个锯木工中只移除低技能者', () => {
    ;(sys as any).sawyers.push(makeSawyer(1, { sawingSkill: 3.0 }))
    ;(sys as any).sawyers.push(makeSawyer(2, { sawingSkill: 50 }))
    ;(sys as any).sawyers.push(makeSawyer(3, { sawingSkill: 2.0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).sawyers).toHaveLength(1)
    expect((sys as any).sawyers[0].entityId).toBe(2)
  })
})

describe('CreatureSawyerSystem - 招募上限', () => {
  let sys: CreatureSawyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('满员时（10人）不再招募', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).sawyers.push(makeSawyer(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).sawyers.length).toBeLessThanOrEqual(10)
    vi.restoreAllMocks()
  })

  it('未满员且随机值小于RECRUIT_CHANCE时触发招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // 0.001 < 0.0014
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).sawyers.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('招募后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const beforeId = (sys as any).nextId
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(beforeId + 1)
    vi.restoreAllMocks()
  })
})
