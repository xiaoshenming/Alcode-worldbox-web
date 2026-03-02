import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureScabbardMakerSystem } from '../systems/CreatureScabbardMakerSystem'
import type { ScabbardMaker } from '../systems/CreatureScabbardMakerSystem'

// CHECK_INTERVAL = 2560, MAX_MAKERS = 12
const CHECK_INTERVAL = 2560
const em = { getEntitiesWithComponent: () => [] } as any

let nextId = 1
function makeSys(): CreatureScabbardMakerSystem { return new CreatureScabbardMakerSystem() }
function makeMaker(entityId: number, overrides: Partial<ScabbardMaker> = {}): ScabbardMaker {
  return {
    id: nextId++,
    entityId,
    leatherWorking: 70,
    woodCarving: 65,
    fittingPrecision: 75,
    outputQuality: 80,
    tick: 0,
    ...overrides,
  }
}

describe('CreatureScabbardMakerSystem - 基础字段', () => {
  let sys: CreatureScabbardMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无刀鞘工', () => { expect((sys as any).makers).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe((sys as any).makers)
  })
  it('字段正确', () => {
    ;(sys as any).makers.push(makeMaker(2))
    const m = (sys as any).makers[0]
    expect(m.leatherWorking).toBe(70)
    expect(m.fittingPrecision).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    expect((sys as any).makers).toHaveLength(2)
  })
})

describe('CreatureScabbardMakerSystem - CHECK_INTERVAL节流', () => {
  let sys: CreatureScabbardMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick不足CHECK_INTERVAL时不更新技能', () => {
    ;(sys as any).makers.push(makeMaker(1, { leatherWorking: 50 }))
    sys.update(1, em, CHECK_INTERVAL - 1)
    expect((sys as any).makers[0].leatherWorking).toBe(50)
  })

  it('tick恰好等于CHECK_INTERVAL时执行更新', () => {
    ;(sys as any).makers.push(makeMaker(1, { leatherWorking: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].leatherWorking).toBeCloseTo(50.02, 5)
  })

  it('两次间隔不足时第二次不再更新', () => {
    ;(sys as any).makers.push(makeMaker(1, { leatherWorking: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    const after1 = (sys as any).makers[0].leatherWorking
    sys.update(1, em, CHECK_INTERVAL + 1) // 差值=1，不足
    expect((sys as any).makers[0].leatherWorking).toBe(after1)
  })

  it('第二个完整间隔后再次更新', () => {
    ;(sys as any).makers.push(makeMaker(1, { leatherWorking: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    sys.update(1, em, CHECK_INTERVAL * 2)
    expect((sys as any).makers[0].leatherWorking).toBeCloseTo(50.04, 5)
  })
})

describe('CreatureScabbardMakerSystem - 技能递增', () => {
  let sys: CreatureScabbardMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('leatherWorking 每次+0.02', () => {
    ;(sys as any).makers.push(makeMaker(1, { leatherWorking: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].leatherWorking).toBeCloseTo(50.02, 5)
  })

  it('fittingPrecision 每次+0.015', () => {
    ;(sys as any).makers.push(makeMaker(1, { fittingPrecision: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].fittingPrecision).toBeCloseTo(50.015, 5)
  })

  it('outputQuality 每次+0.01', () => {
    ;(sys as any).makers.push(makeMaker(1, { outputQuality: 50 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].outputQuality).toBeCloseTo(50.01, 5)
  })

  it('leatherWorking 上限100，不超过', () => {
    ;(sys as any).makers.push(makeMaker(1, { leatherWorking: 99.99 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].leatherWorking).toBe(100)
  })

  it('outputQuality 已达100时不继续增加', () => {
    ;(sys as any).makers.push(makeMaker(1, { outputQuality: 100 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].outputQuality).toBe(100)
  })

  it('woodCarving 不在技能递增列表，保持不变', () => {
    ;(sys as any).makers.push(makeMaker(1, { woodCarving: 60 }))
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers[0].woodCarving).toBe(60)
  })
})

describe('CreatureScabbardMakerSystem - cleanup边界', () => {
  let sys: CreatureScabbardMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('leatherWorking 恰好为3.98时（+0.02=4.0），等于4仍被移除', () => {
    ;(sys as any).makers.push(makeMaker(1, { leatherWorking: 3.98 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.0, cleanup条件 <= 4, 所以被移除
    expect((sys as any).makers).toHaveLength(0)
  })

  it('leatherWorking 为4.01时不被移除', () => {
    ;(sys as any).makers.push(makeMaker(1, { leatherWorking: 4.01 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    // 4.01 + 0.02 = 4.03 > 4, 不移除
    expect((sys as any).makers).toHaveLength(1)
  })

  it('leatherWorking <= 4 时从列表移除（低值测试）', () => {
    ;(sys as any).makers.push(makeMaker(1, { leatherWorking: 1.0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    // 1.0 + 0.02 = 1.02 <= 4, 被移除
    expect((sys as any).makers).toHaveLength(0)
  })

  it('多个刀鞘工中只移除低技能者', () => {
    ;(sys as any).makers.push(makeMaker(1, { leatherWorking: 3.0 }))
    ;(sys as any).makers.push(makeMaker(2, { leatherWorking: 50 }))
    ;(sys as any).makers.push(makeMaker(3, { leatherWorking: 2.0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
})

describe('CreatureScabbardMakerSystem - 招募上限', () => {
  let sys: CreatureScabbardMakerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('满员时（12人）不再招募', () => {
    for (let i = 0; i < 12; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9999)
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers.length).toBeLessThanOrEqual(12)
    vi.restoreAllMocks()
  })

  it('未满员且随机值小于RECRUIT_CHANCE时触发招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // 0.001 < 0.0017
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('招募后nextId递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const beforeId = (sys as any).nextId
    sys.update(1, em, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(beforeId + 1)
    vi.restoreAllMocks()
  })

  it('刀鞘工上限为12，大于马鞍工/锯木工的10', () => {
    // 验证MAX_MAKERS=12而非10
    for (let i = 0; i < 11; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, em, CHECK_INTERVAL)
    // 11人未满12，可以招募
    expect((sys as any).makers.length).toBeGreaterThan(11)
    vi.restoreAllMocks()
  })
})
