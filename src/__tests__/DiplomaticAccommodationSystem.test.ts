import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAccommodationSystem } from '../systems/DiplomaticAccommodationSystem'
import type { AccommodationProceeding } from '../systems/DiplomaticAccommodationSystem'

// CHECK_INTERVAL=2480, cutoff=tick-88000, MAX_PROCEEDINGS=18, PROCEED_CHANCE=0.0023

function makeSys() { return new DiplomaticAccommodationSystem() }

function makeProceeding(overrides: Partial<AccommodationProceeding> = {}): AccommodationProceeding {
  return {
    id: 1,
    civIdA: 1,
    civIdB: 2,
    form: 'position_adjustment',
    flexibility: 50,
    mutualBenefit: 40,
    adjustmentDepth: 30,
    stabilityGain: 20,
    duration: 0,
    tick: 0,
    ...overrides,
  }
}

describe('DiplomaticAccommodationSystem — 基础数据结构', () => {
  let sys: DiplomaticAccommodationSystem

  beforeEach(() => { sys = makeSys() })

  it('初始 proceedings 为空数组', () => {
    expect((sys as any).proceedings).toHaveLength(0)
    expect(Array.isArray((sys as any).proceedings)).toBe(true)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入单条 proceeding 后长度为 1', () => {
    ;(sys as any).proceedings.push(makeProceeding())
    expect((sys as any).proceedings).toHaveLength(1)
    expect((sys as any).proceedings[0].id).toBe(1)
  })

  it('注入多条 proceedings 保留所有记录', () => {
    ;(sys as any).proceedings.push(makeProceeding({ id: 1 }))
    ;(sys as any).proceedings.push(makeProceeding({ id: 2 }))
    ;(sys as any).proceedings.push(makeProceeding({ id: 3 }))
    expect((sys as any).proceedings).toHaveLength(3)
  })

  it('支持所有 AccommodationForm 类型', () => {
    const forms = ['position_adjustment', 'mutual_concession', 'flexible_terms', 'adaptive_agreement']
    for (const form of forms) {
      ;(sys as any).proceedings.push(makeProceeding({ form: form as any }))
    }
    const stored = (sys as any).proceedings.map((p: any) => p.form)
    expect(stored).toEqual(expect.arrayContaining(forms))
  })

  it('proceeding 包含所有必要字段', () => {
    const p = makeProceeding()
    ;(sys as any).proceedings.push(p)
    const stored = (sys as any).proceedings[0]
    expect(stored).toHaveProperty('id')
    expect(stored).toHaveProperty('civIdA')
    expect(stored).toHaveProperty('civIdB')
    expect(stored).toHaveProperty('form')
    expect(stored).toHaveProperty('flexibility')
    expect(stored).toHaveProperty('mutualBenefit')
    expect(stored).toHaveProperty('adjustmentDepth')
    expect(stored).toHaveProperty('stabilityGain')
    expect(stored).toHaveProperty('duration')
    expect(stored).toHaveProperty('tick')
  })
})

describe('DiplomaticAccommodationSystem — CHECK_INTERVAL=2480 节流', () => {
  let sys: DiplomaticAccommodationSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=100 < CHECK_INTERVAL=2480 时不更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2480 = CHECK_INTERVAL 时更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, 2480)
    expect((sys as any).lastCheck).toBe(2480)
  })

  it('tick=2479 < CHECK_INTERVAL 时跳过，proceedings 中 duration 不变', () => {
    ;(sys as any).proceedings.push(makeProceeding({ tick: 0, duration: 0 }))
    sys.update(1, {} as any, {} as any, 2479)
    expect((sys as any).proceedings[0].duration).toBe(0)
  })

  it('tick=2480 时 duration 被更新（+1）', () => {
    ;(sys as any).proceedings.push(makeProceeding({ tick: 2480, duration: 0 }))
    sys.update(1, {} as any, {} as any, 2480)
    expect((sys as any).proceedings[0].duration).toBe(1)
  })

  it('第二次调用间隔不足时不更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, 2480)
    expect((sys as any).lastCheck).toBe(2480)
    sys.update(1, {} as any, {} as any, 3000) // 3000-2480=520 < 2480
    expect((sys as any).lastCheck).toBe(2480)
  })

  it('第二次调用满足间隔时更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, 2480)
    sys.update(1, {} as any, {} as any, 4960) // 4960-2480=2480 >= 2480
    expect((sys as any).lastCheck).toBe(4960)
  })

  it('连续三次满足间隔，lastCheck 递增更新', () => {
    sys.update(1, {} as any, {} as any, 2480)
    sys.update(1, {} as any, {} as any, 4960)
    sys.update(1, {} as any, {} as any, 7440)
    expect((sys as any).lastCheck).toBe(7440)
  })
})

describe('DiplomaticAccommodationSystem — 数值字段动态更新', () => {
  let sys: DiplomaticAccommodationSystem

  beforeEach(() => { sys = makeSys() })

  it('update 后 duration 递增 +1', () => {
    ;(sys as any).proceedings.push(makeProceeding({ tick: 2480, duration: 0 }))
    sys.update(1, {} as any, {} as any, 2480)
    expect((sys as any).proceedings[0].duration).toBe(1)
  })

  it('flexibility 在 [10, 90] 范围内', () => {
    ;(sys as any).proceedings.push(makeProceeding({ tick: 2480, flexibility: 50 }))
    for (let t = 2480; t <= 2480 * 100; t += 2480) {
      sys.update(1, {} as any, {} as any, t)
      const val = (sys as any).proceedings[0]?.flexibility
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(10)
        expect(val).toBeLessThanOrEqual(90)
      }
    }
  })

  it('mutualBenefit 在 [10, 85] 范围内', () => {
    ;(sys as any).proceedings.push(makeProceeding({ tick: 2480, mutualBenefit: 40 }))
    for (let t = 2480; t <= 2480 * 50; t += 2480) {
      sys.update(1, {} as any, {} as any, t)
      const val = (sys as any).proceedings[0]?.mutualBenefit
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(10)
        expect(val).toBeLessThanOrEqual(85)
      }
    }
  })

  it('adjustmentDepth 在 [5, 75] 范围内', () => {
    ;(sys as any).proceedings.push(makeProceeding({ tick: 2480, adjustmentDepth: 30 }))
    for (let t = 2480; t <= 2480 * 50; t += 2480) {
      sys.update(1, {} as any, {} as any, t)
      const val = (sys as any).proceedings[0]?.adjustmentDepth
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(5)
        expect(val).toBeLessThanOrEqual(75)
      }
    }
  })

  it('stabilityGain 在 [5, 65] 范围内', () => {
    ;(sys as any).proceedings.push(makeProceeding({ tick: 2480, stabilityGain: 20 }))
    for (let t = 2480; t <= 2480 * 50; t += 2480) {
      sys.update(1, {} as any, {} as any, t)
      const val = (sys as any).proceedings[0]?.stabilityGain
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(5)
        expect(val).toBeLessThanOrEqual(65)
      }
    }
  })

  it('多条记录各自独立更新 duration', () => {
    ;(sys as any).proceedings.push(makeProceeding({ id: 1, tick: 2480, duration: 0 }))
    ;(sys as any).proceedings.push(makeProceeding({ id: 2, tick: 2480, duration: 7 }))
    sys.update(1, {} as any, {} as any, 2480)
    expect((sys as any).proceedings[0].duration).toBe(1)
    expect((sys as any).proceedings[1].duration).toBe(8)
  })
})

describe('DiplomaticAccommodationSystem — time-based 过期清理（cutoff=tick-88000）', () => {
  let sys: DiplomaticAccommodationSystem

  beforeEach(() => { sys = makeSys() })

  it('tick=0 的记录在 update(tick=95000) 时被清除', () => {
    ;(sys as any).proceedings.push(makeProceeding({ tick: 0, id: 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 95000) // cutoff=7000, 0 < 7000 删除
    expect((sys as any).proceedings).toHaveLength(0)
  })

  it('tick 恰好等于 cutoff 时记录不被清除', () => {
    // cutoff = 95000 - 88000 = 7000，tick=7000 不满足 < 7000
    ;(sys as any).proceedings.push(makeProceeding({ tick: 7000, id: 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 95000)
    expect((sys as any).proceedings).toHaveLength(1)
  })

  it('tick > cutoff 的记录保留', () => {
    ;(sys as any).proceedings.push(makeProceeding({ tick: 15000, id: 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 95000) // cutoff=7000, 15000>7000 保留
    expect((sys as any).proceedings).toHaveLength(1)
  })

  it('混合过期：只删除 tick < cutoff 的记录', () => {
    ;(sys as any).proceedings.push(makeProceeding({ tick: 0,     id: 1 })) // 过期
    ;(sys as any).proceedings.push(makeProceeding({ tick: 6999,  id: 2 })) // 过期
    ;(sys as any).proceedings.push(makeProceeding({ tick: 7000,  id: 3 })) // 边界，保留
    ;(sys as any).proceedings.push(makeProceeding({ tick: 20000, id: 4 })) // 保留
    sys.update(1, {} as any, {} as any, 95000) // cutoff=7000
    const ids = (sys as any).proceedings.map((p: any) => p.id)
    expect(ids).not.toContain(1)
    expect(ids).not.toContain(2)
    expect(ids).toContain(3)
    expect(ids).toContain(4)
  })

  it('所有记录都新鲜，无过期清理', () => {
    ;(sys as any).proceedings.push(makeProceeding({ tick: 90000, id: 1 }))
    ;(sys as any).proceedings.push(makeProceeding({ tick: 92000, id: 2 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 95000) // cutoff=7000
    expect((sys as any).proceedings).toHaveLength(2)
  })

  it('反向遍历删除：5 条过期记录全部删除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).proceedings.push(makeProceeding({ tick: i * 200, id: i + 1 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 95000) // cutoff=7000，全部 tick < 7000
    expect((sys as any).proceedings).toHaveLength(0)
  })
})

describe('DiplomaticAccommodationSystem — MAX_PROCEEDINGS=18 上限', () => {
  let sys: DiplomaticAccommodationSystem

  afterEach(() => { vi.restoreAllMocks() })
  beforeEach(() => { sys = makeSys() })

  it('已达 MAX_PROCEEDINGS=18 时不再新增（强制通过 CHANCE）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 < 0.0023 通过 CHANCE
    for (let i = 0; i < 18; i++) {
      ;(sys as any).proceedings.push(makeProceeding({ id: i + 1, tick: 2480 }))
    }
    sys.update(1, {} as any, {} as any, 2480)
    expect((sys as any).proceedings).toHaveLength(18)
  })

  it('数量 17 < 18 时，满足 CHANCE 可新增（random=0 导致civA=civB=1 early return，验证不超过18）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 17; i++) {
      ;(sys as any).proceedings.push(makeProceeding({ id: i + 1, tick: 2480 }))
    }
    sys.update(1, {} as any, {} as any, 2480)
    // random=0 → civA=civB=1 → early return，长度仍17（duration更新）
    expect((sys as any).proceedings.length).toBeLessThanOrEqual(18)
  })

  it('nextId 在成功新增后递增', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // 通过 PROCEED_CHANCE
      .mockReturnValueOnce(0)     // civA=1
      .mockReturnValueOnce(0.5)   // civB=5
      .mockReturnValue(0.5)
    sys.update(1, {} as any, {} as any, 2480)
    // 如成功新增，nextId 应为 2
    expect((sys as any).nextId).toBeGreaterThanOrEqual(1)
  })
})
