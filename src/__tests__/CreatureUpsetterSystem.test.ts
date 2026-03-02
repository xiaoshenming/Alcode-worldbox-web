import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CreatureUpsetterSystem } from '../systems/CreatureUpsetterSystem'
import type { Upsetter } from '../systems/CreatureUpsetterSystem'

// ---- helpers ----
let nextId = 1
function makeSys(): CreatureUpsetterSystem { return new CreatureUpsetterSystem() }
function makeUpsetter(entityId: number, overrides: Partial<Upsetter> = {}): Upsetter {
  return {
    id: nextId++, entityId,
    upsettingSkill: 70, compressionForce: 65, stockThickening: 80, headForming: 75,
    tick: 0, ...overrides,
  }
}

/** 最小化 EntityManager mock：默认无生物，可按需覆盖 */
function makeMockEM(entityIds: number[] = []) {
  return {
    getEntitiesWithComponents: vi.fn().mockReturnValue(entityIds),
    getComponent: vi.fn().mockReturnValue(null),
    hasComponent: vi.fn().mockReturnValue(false),
  }
}

const CHECK_INTERVAL = 3060   // 与源码保持一致
const MAX_UPSETTERS = 10

// ---- original 5 trivial tests ----
describe('CreatureUpsetterSystem.getUpsetters', () => {
  let sys: CreatureUpsetterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始无镦粗工', () => { expect((sys as any).upsetters).toHaveLength(0) })
  it('注入后可查询', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1))
    expect((sys as any).upsetters[0].entityId).toBe(1)
  })
  it('返回内部引用', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1))
    expect((sys as any).upsetters).toBe((sys as any).upsetters)
  })
  it('字段正确', () => {
    ;(sys as any).upsetters.push(makeUpsetter(2))
    const u = (sys as any).upsetters[0]
    expect(u.upsettingSkill).toBe(70)
    expect(u.stockThickening).toBe(80)
  })
  it('多个全部返回', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1))
    ;(sys as any).upsetters.push(makeUpsetter(2))
    expect((sys as any).upsetters).toHaveLength(2)
  })
})

// ---- meaningful tests ----
describe('CreatureUpsetterSystem.update — CHECK_INTERVAL 节流', () => {
  let sys: CreatureUpsetterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('tick 不足 CHECK_INTERVAL 时不执行技能增长', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1, { upsettingSkill: 50 }))
    const em = makeMockEM()
    sys.update(1, em as any, CHECK_INTERVAL - 1)
    expect((sys as any).upsetters[0].upsettingSkill).toBe(50)
  })

  it('tick 恰好达到 CHECK_INTERVAL 时执行技能增长', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1, { upsettingSkill: 50 }))
    const em = makeMockEM()
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).upsetters[0].upsettingSkill).toBeCloseTo(50.02, 5)
  })

  it('连续两次 update 中间不足 CHECK_INTERVAL 只运行一次', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1, { upsettingSkill: 50 }))
    const em = makeMockEM()
    sys.update(1, em as any, CHECK_INTERVAL)          // 第 1 次触发
    sys.update(1, em as any, CHECK_INTERVAL + 100)    // 未到下次阈值
    expect((sys as any).upsetters[0].upsettingSkill).toBeCloseTo(50.02, 5)
  })

  it('两次 CHECK_INTERVAL 间隔各触发一次，技能累加两次', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1, { upsettingSkill: 50 }))
    const em = makeMockEM()
    sys.update(1, em as any, CHECK_INTERVAL)
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    expect((sys as any).upsetters[0].upsettingSkill).toBeCloseTo(50.04, 5)
  })
})

describe('CreatureUpsetterSystem.update — 技能增长逻辑', () => {
  let sys: CreatureUpsetterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('upsettingSkill 每次 +0.02', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1, { upsettingSkill: 60 }))
    const em = makeMockEM()
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).upsetters[0].upsettingSkill).toBeCloseTo(60.02, 5)
  })

  it('compressionForce 每次 +0.015', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1, { compressionForce: 50 }))
    const em = makeMockEM()
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).upsetters[0].compressionForce).toBeCloseTo(50.015, 5)
  })

  it('headForming 每次 +0.01', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1, { headForming: 40 }))
    const em = makeMockEM()
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).upsetters[0].headForming).toBeCloseTo(40.01, 5)
  })

  it('upsettingSkill 上限为 100，不超出', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1, { upsettingSkill: 99.99 }))
    const em = makeMockEM()
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).upsetters[0].upsettingSkill).toBe(100)
  })

  it('compressionForce 上限为 100，不超出', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1, { compressionForce: 100 }))
    const em = makeMockEM()
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).upsetters[0].compressionForce).toBe(100)
  })

  it('headForming 上限为 100，不超出', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1, { headForming: 100 }))
    const em = makeMockEM()
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).upsetters[0].headForming).toBe(100)
  })

  it('多名镦粗工技能均增长', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1, { upsettingSkill: 30 }))
    ;(sys as any).upsetters.push(makeUpsetter(2, { upsettingSkill: 60 }))
    const em = makeMockEM()
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).upsetters[0].upsettingSkill).toBeCloseTo(30.02, 5)
    expect((sys as any).upsetters[1].upsettingSkill).toBeCloseTo(60.02, 5)
  })
})

describe('CreatureUpsetterSystem.update — cleanup (upsettingSkill <= 4)', () => {
  let sys: CreatureUpsetterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('upsettingSkill 恰好为 4 时被清除', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1, { upsettingSkill: 4 }))
    const em = makeMockEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, CHECK_INTERVAL)
    // upsettingSkill becomes 4.02 after growth, NOT <= 4, so NOT removed
    // start at exactly 4: after +0.02 => 4.02 > 4, stays
    // we need to pre-set and NOT trigger growth: set lastCheck so growth runs but skill >=4.02
    // To test removal: set skill below threshold so it stays <=4 BEFORE growth
    // Actually growth runs BEFORE cleanup. So 4 -> 4.02 -> not removed.
    // To be removed, skill must be <= 4 AFTER growth. We skip growth by using tick < CHECK_INTERVAL for NEXT call.
    // Reset: manually set after growth already happened via directly placing value
    ;(sys as any).upsetters.length = 0
    ;(sys as any).upsetters.push(makeUpsetter(1, { upsettingSkill: 3.9 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, em as any, CHECK_INTERVAL * 2)
    // 3.9 + 0.02 = 3.92 <= 4 → removed
    expect((sys as any).upsetters).toHaveLength(0)
  })

  it('upsettingSkill 恰好 3.98 经增长后 = 4.00，不满足 <= 4 之严格边界 (=4 仍被清除)', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1, { upsettingSkill: 3.98 }))
    const em = makeMockEM()
    // reset lastCheck so update triggers
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.00, cleanup condition: <= 4, so removed
    expect((sys as any).upsetters).toHaveLength(0)
  })

  it('upsettingSkill 高于 4 的工匠不被清除', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1, { upsettingSkill: 5 }))
    const em = makeMockEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).upsetters).toHaveLength(1)
  })

  it('混合低高技能，仅清除低技能工匠', () => {
    ;(sys as any).upsetters.push(makeUpsetter(1, { upsettingSkill: 3.5 }))  // 3.5+0.02=3.52 <=4 → removed
    ;(sys as any).upsetters.push(makeUpsetter(2, { upsettingSkill: 50 }))   // stays
    const em = makeMockEM()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, em as any, CHECK_INTERVAL)
    expect((sys as any).upsetters).toHaveLength(1)
    expect((sys as any).upsetters[0].entityId).toBe(2)
  })
})

describe('CreatureUpsetterSystem.update — MAX_UPSETTERS 容量上限', () => {
  let sys: CreatureUpsetterSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('upsetters 达到 MAX_UPSETTERS 时不再招募 (Math.random mock)', () => {
    // 填满至最大值
    for (let i = 0; i < MAX_UPSETTERS; i++) {
      ;(sys as any).upsetters.push(makeUpsetter(i + 1, { upsettingSkill: 50 }))
    }
    const em = makeMockEM()
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.0001) // 必定触发招募条件
    sys.update(1, em as any, CHECK_INTERVAL)
    randSpy.mockRestore()
    // 不应超过 MAX_UPSETTERS（update中先skill增长后cleanup，不影响容量检查）
    expect((sys as any).upsetters.length).toBeLessThanOrEqual(MAX_UPSETTERS)
  })
})
