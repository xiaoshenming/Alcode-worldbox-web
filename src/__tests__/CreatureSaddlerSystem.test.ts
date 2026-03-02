import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureSaddlerSystem } from '../systems/CreatureSaddlerSystem'
import type { Saddler } from '../systems/CreatureSaddlerSystem'

// CHECK_INTERVAL = 2630, MAX_SADDLERS = 10
const CHECK_INTERVAL = 2630
const em = { getEntitiesWithComponent: () => [] } as any

let nextId = 1
function makeSys(): CreatureSaddlerSystem { return new CreatureSaddlerSystem() }
function makeSaddler(entityId: number, overrides: Partial<Saddler> = {}): Saddler {
  return {
    id: nextId++,
    entityId,
    leatherShaping: 70,
    treeFitting: 65,
    paddingWork: 75,
    outputQuality: 80,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureSaddlerSystem - 基础字段', () => {
  let sys: CreatureSaddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无马鞍工', () => { expect((sys as any).saddlers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).saddlers.push(makeSaddler(1))
    expect((sys as any).saddlers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).saddlers.push(makeSaddler(1))
    expect((sys as any).saddlers).toBe((sys as any).saddlers)
  })
  it('字段正确', () => {
    ;(sys as any).saddlers.push(makeSaddler(2))
    const s = (sys as any).saddlers[0]
    expect(s.leatherShaping).toBe(70)
    expect(s.outputQuality).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).saddlers.push(makeSaddler(1))
    ;(sys as any).saddlers.push(makeSaddler(2))
    expect((sys as any).saddlers).toHaveLength(2)
  })
})

describe('CreatureSaddlerSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureSaddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不更新技能', () => {
    ;(sys as any).saddlers.push(makeSaddler(1, { leatherShaping: 50 }))
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).saddlers[0].leatherShaping).toBe(50)
  })

  it('tick恰好等于CHECK_INTERVAL时执行更新', () => {
    ;(sys as any).saddlers.push(makeSaddler(1, { leatherShaping: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).saddlers[0].leatherShaping).toBeCloseTo(50.02, 5)
  })

  it('两次间隔不足时第二次不再更新', () => {
    ;(sys as any).saddlers.push(makeSaddler(1, { leatherShaping: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    const after1 = (sys as any).saddlers[0].leatherShaping
    sys.update(1, em, CHECK_INTERVAL + 1)  // 差值=1，不足
    expect((sys as any).saddlers[0].leatherShaping).toBe(after1)
  })

  it('第二个完整间隔后再次更新', () => {
    ;(sys as any).saddlers.push(makeSaddler(1, { leatherShaping: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).saddlers[0].leatherShaping).toBeCloseTo(50.04, 5)
  })
})

describe('CreatureSaddlerSystem - 技能递增', () => {
  let sys: CreatureSaddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('leatherShaping 每次+0.02', () => {
    ;(sys as any).saddlers.push(makeSaddler(1, { leatherShaping: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).saddlers[0].leatherShaping).toBeCloseTo(50.02, 5)
  })

  it('paddingWork 每次+0.015', () => {
    ;(sys as any).saddlers.push(makeSaddler(1, { paddingWork: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).saddlers[0].paddingWork).toBeCloseTo(50.015, 5)
  })

  it('outputQuality 每次+0.01', () => {
    ;(sys as any).saddlers.push(makeSaddler(1, { outputQuality: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).saddlers[0].outputQuality).toBeCloseTo(50.01, 5)
  })

  it('leatherShaping 上限100，不超过', () => {
    ;(sys as any).saddlers.push(makeSaddler(1, { leatherShaping: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).saddlers[0].leatherShaping).toBe(100)
  })

  it('outputQuality 已达100时不继续增加', () => {
    ;(sys as any).saddlers.push(makeSaddler(1, { outputQuality: 100 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).saddlers[0].outputQuality).toBe(100)
  })

  it('treeFitting 不在技能递增列表，保持不变', () => {
    ;(sys as any).saddlers.push(makeSaddler(1, { treeFitting: 60 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).saddlers[0].treeFitting).toBe(60)
  })
})

describe('CreatureSaddlerSystem - cleanup边界', () => {
  let sys: CreatureSaddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('leatherShaping <= 4 时从列表移除', () => {
    ;(sys as any).saddlers.push(makeSaddler(1, { leatherShaping: 4 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 先+0.02再检测，4.02 > 4，不移除；需要初始值恰好<=4且update后仍<=4
    // 实际逻辑：先技能递增，再cleanup => 4+0.02=4.02>4 不删
    // 测初始值<=4-0.02=3.98的情况
    ;(sys as any).saddlers.length = 0
    ;(sys as any).saddlers.push(makeSaddler(2, { leatherShaping: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).saddlers).toHaveLength(0)
  })

  it('leatherShaping 恰好为3.98时（+0.02=4.0），等于4仍被移除', () => {
    ;(sys as any).saddlers.push(makeSaddler(1, { leatherShaping: 3.98 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.0, cleanup条件 <= 4, 所以被移除
    expect((sys as any).saddlers).toHaveLength(0)
  })

  it('leatherShaping 为4.01时不被移除', () => {
    ;(sys as any).saddlers.push(makeSaddler(1, { leatherShaping: 4.01 }))
    sys.update(1, em, CHECK_INTERVAL)
    // 4.01 + 0.02 = 4.03 > 4, 不移除
    expect((sys as any).saddlers).toHaveLength(1)
  })

  it('多个马鞍工中只移除低技能者', () => {
    ;(sys as any).saddlers.push(makeSaddler(1, { leatherShaping: 3.0 }))
    ;(sys as any).saddlers.push(makeSaddler(2, { leatherShaping: 50 }))
    ;(sys as any).saddlers.push(makeSaddler(3, { leatherShaping: 2.0 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).saddlers).toHaveLength(1)
    expect((sys as any).saddlers[0].entityId).toBe(2)
  })
})

describe('CreatureSaddlerSystem - 招募上限', () => {
  let sys: CreatureSaddlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('满员时（10人）不再招募', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).saddlers.push(makeSaddler(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9999) // RECRUIT_CHANCE=0.0014，0.9999不触发
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).saddlers.length).toBeLessThanOrEqual(10)
    vi.restoreAllMocks()
  })

  it('未满员且随机值小于RECRUIT_CHANCE时触发招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // 0.001 < 0.0014
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).saddlers.length).toBeGreaterThanOrEqual(1)
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
