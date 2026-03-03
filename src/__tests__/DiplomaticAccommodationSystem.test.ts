import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAccommodationSystem } from '../systems/DiplomaticAccommodationSystem'
import type { AccommodationProceeding } from '../systems/DiplomaticAccommodationSystem'

// CHECK_INTERVAL=2480, cutoff=tick-88000, MAX_PROCEEDINGS=18, PROCEED_CHANCE=0.0023
const CI = 2480
const MAX = 18
const CUTOFF = 88000

function makeSys() { return new DiplomaticAccommodationSystem() }
function makeP(overrides: Partial<AccommodationProceeding> = {}): AccommodationProceeding {
  return { id: 1, civIdA: 1, civIdB: 2, form: 'position_adjustment', flexibility: 50,
    mutualBenefit: 40, adjustmentDepth: 30, stabilityGain: 20, duration: 0, tick: 0, ...overrides }
}

describe('DiplomaticAccommodationSystem', () => {
  let sys: DiplomaticAccommodationSystem

  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  // 基础数据结构
  it('初始 proceedings 为空数组', () => { expect((sys as any).proceedings).toHaveLength(0) })
  it('proceedings 是 Array 类型', () => { expect(Array.isArray((sys as any).proceedings)).toBe(true) })
  it('nextId 初始为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck 初始为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入单条 proceeding 后长度为 1', () => {
    ;(sys as any).proceedings.push(makeP()); expect((sys as any).proceedings).toHaveLength(1)
  })
  it('注入多条 proceedings 保留全部', () => {
    for (let i = 1; i <= 3; i++) { ;(sys as any).proceedings.push(makeP({ id: i })) }
    expect((sys as any).proceedings).toHaveLength(3)
  })
  it('支持所有 AccommodationForm 类型', () => {
    const forms = ['position_adjustment', 'mutual_concession', 'flexible_terms', 'adaptive_agreement']
    for (const form of forms) { ;(sys as any).proceedings.push(makeP({ form: form as any })) }
    expect((sys as any).proceedings.map((p: any) => p.form)).toEqual(expect.arrayContaining(forms))
  })
  it('proceeding 包含所有必要字段', () => {
    ;(sys as any).proceedings.push(makeP())
    const s = (sys as any).proceedings[0]
    ;['id','civIdA','civIdB','form','flexibility','mutualBenefit','adjustmentDepth','stabilityGain','duration','tick']
      .forEach(k => expect(s).toHaveProperty(k))
  })
  it('civIdA 和 civIdB 可独立读取', () => {
    ;(sys as any).proceedings.push(makeP({ civIdA: 4, civIdB: 7 }))
    expect((sys as any).proceedings[0].civIdA).toBe(4)
    expect((sys as any).proceedings[0].civIdB).toBe(7)
  })
  it('duration 初始为 0', () => {
    ;(sys as any).proceedings.push(makeP({ duration: 0 }))
    expect((sys as any).proceedings[0].duration).toBe(0)
  })

  // CHECK_INTERVAL 节流
  it('tick < CI 时不更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, CI - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick = CI 时更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).lastCheck).toBe(CI)
  })
  it('tick > CI 时更新 lastCheck 为 tick 值', () => {
    sys.update(1, {} as any, {} as any, CI + 100)
    expect((sys as any).lastCheck).toBe(CI + 100)
  })
  it('tick < CI 时 duration 不变', () => {
    ;(sys as any).proceedings.push(makeP({ duration: 0, tick: 0 }))
    sys.update(1, {} as any, {} as any, CI - 1)
    expect((sys as any).proceedings[0].duration).toBe(0)
  })
  it('第二次调用不足间隔时 lastCheck 不更新', () => {
    sys.update(1, {} as any, {} as any, CI)
    sys.update(1, {} as any, {} as any, CI + 100)
    expect((sys as any).lastCheck).toBe(CI)
  })
  it('第二次满足间隔时更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, CI)
    sys.update(1, {} as any, {} as any, CI * 2)
    expect((sys as any).lastCheck).toBe(CI * 2)
  })
  it('三次满足间隔时 lastCheck 跟随最新', () => {
    sys.update(1, {} as any, {} as any, CI)
    sys.update(1, {} as any, {} as any, CI * 2)
    sys.update(1, {} as any, {} as any, CI * 3)
    expect((sys as any).lastCheck).toBe(CI * 3)
  })
  it('tick=0 不触发更新', () => {
    sys.update(1, {} as any, {} as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  // 数值字段动态更新
  it('update 后 duration +1', () => {
    ;(sys as any).proceedings.push(makeP({ tick: CI, duration: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings[0].duration).toBe(1)
  })
  it('三次 update 后 duration 为 3', () => {
    ;(sys as any).proceedings.push(makeP({ tick: 0, duration: 0 }))
    for (let i = 1; i <= 3; i++) { sys.update(1, {} as any, {} as any, CI * i) }
    expect((sys as any).proceedings[0].duration).toBe(3)
  })
  it('flexibility �� [10, 90] 范围内', () => {
    ;(sys as any).proceedings.push(makeP({ tick: CI, flexibility: 50 }))
    sys.update(1, {} as any, {} as any, CI)
    const v = (sys as any).proceedings[0].flexibility
    expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90)
  })
  it('mutualBenefit 在 [10, 85] 范围内', () => {
    ;(sys as any).proceedings.push(makeP({ tick: CI, mutualBenefit: 40 }))
    sys.update(1, {} as any, {} as any, CI)
    const v = (sys as any).proceedings[0].mutualBenefit
    expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(85)
  })
  it('adjustmentDepth 在 [5, 75] 范围内', () => {
    ;(sys as any).proceedings.push(makeP({ tick: CI, adjustmentDepth: 30 }))
    sys.update(1, {} as any, {} as any, CI)
    const v = (sys as any).proceedings[0].adjustmentDepth
    expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(75)
  })
  it('stabilityGain 在 [5, 65] 范围内', () => {
    ;(sys as any).proceedings.push(makeP({ tick: CI, stabilityGain: 20 }))
    sys.update(1, {} as any, {} as any, CI)
    const v = (sys as any).proceedings[0].stabilityGain
    expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(65)
  })
  it('多条记录各自独立更新 duration', () => {
    ;(sys as any).proceedings.push(makeP({ id: 1, tick: CI, duration: 0 }))
    ;(sys as any).proceedings.push(makeP({ id: 2, tick: CI, duration: 7 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings[0].duration).toBe(1)
    expect((sys as any).proceedings[1].duration).toBe(8)
  })
  it('flexibility 下界不低于 10', () => {
    ;(sys as any).proceedings.push(makeP({ tick: 0, flexibility: 10 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings[0].flexibility).toBeGreaterThanOrEqual(10)
  })
  it('stabilityGain 下界不低于 5', () => {
    ;(sys as any).proceedings.push(makeP({ tick: 0, stabilityGain: 5 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings[0].stabilityGain).toBeGreaterThanOrEqual(5)
  })
  it('flexibility 上界不超过 90', () => {
    ;(sys as any).proceedings.push(makeP({ tick: 0, flexibility: 90 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings[0].flexibility).toBeLessThanOrEqual(90)
  })

  // 过期清理
  it('tick=0 的记录在大 tick 时被清理', () => {
    ;(sys as any).proceedings.push(makeP({ id: 1, tick: 0 }))
    sys.update(1, {} as any, {} as any, CUTOFF + CI + 1)
    expect((sys as any).proceedings).toHaveLength(0)
  })
  it('未过期记录保留', () => {
    const big = CUTOFF + CI + 1
    ;(sys as any).proceedings.push(makeP({ id: 1, tick: big }))
    sys.update(1, {} as any, {} as any, big)
    expect((sys as any).proceedings).toHaveLength(1)
  })
  it('tick 恰好等于 cutoff 时保留（不满足 < cutoff）', () => {
    const tick = 90000
    const cutoff = tick - CUTOFF // = 2000
    ;(sys as any).proceedings.push(makeP({ tick: cutoff, id: 1 }))
    sys.update(1, {} as any, {} as any, tick)
    expect((sys as any).proceedings).toHaveLength(1)
  })
  it('混合新旧：只删过期', () => {
    const big = CUTOFF + CI + 1
    ;(sys as any).proceedings.push(makeP({ id: 1, tick: 0 }))
    ;(sys as any).proceedings.push(makeP({ id: 2, tick: big }))
    sys.update(1, {} as any, {} as any, big)
    expect((sys as any).proceedings).toHaveLength(1)
    expect((sys as any).proceedings[0].id).toBe(2)
  })
  it('5 条全过期全部被删', () => {
    for (let i = 1; i <= 5; i++) { ;(sys as any).proceedings.push(makeP({ id: i, tick: 0 })) }
    sys.update(1, {} as any, {} as any, CUTOFF + CI + 1)
    expect((sys as any).proceedings).toHaveLength(0)
  })

  // MAX 上限
  it('达到 MAX=18 时不新增', () => {
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 1; i <= MAX; i++) { ;(sys as any).proceedings.push(makeP({ id: i, tick: CI })) }
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings.length).toBeLessThanOrEqual(MAX)
  })
  it('系统实例相互独立', () => {
    const s2 = makeSys()
    ;(sys as any).proceedings.push(makeP())
    expect((s2 as any).proceedings).toHaveLength(0)
  })
  it('update 不改变 form 字段', () => {
    ;(sys as any).proceedings.push(makeP({ form: 'adaptive_agreement', tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings[0].form).toBe('adaptive_agreement')
  })
  it('civA === civB 时不新增（random=0 使 civA=civB=1）', () => {
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings).toHaveLength(0)
  })
})

describe('DiplomaticAccommodationSystem — 额外完整性测试', () => {
  let sys: DiplomaticAccommodationSystem
  const CI = 2480

  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('update 不改变 civIdA', () => {
    ;(sys as any).proceedings.push(makeP({ civIdA: 9, tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings[0].civIdA).toBe(9)
  })
  it('update 不改变 civIdB', () => {
    ;(sys as any).proceedings.push(makeP({ civIdB: 6, tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings[0].civIdB).toBe(6)
  })
  it('update 不改变 id', () => {
    ;(sys as any).proceedings.push(makeP({ id: 55, tick: 0 }))
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings[0].id).toBe(55)
  })
  it('adjustmentDepth 下界不低于 5', () => {
    ;(sys as any).proceedings.push(makeP({ tick: 0, adjustmentDepth: 5 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings[0].adjustmentDepth).toBeGreaterThanOrEqual(5)
  })
  it('mutualBenefit 下界不低于 10', () => {
    ;(sys as any).proceedings.push(makeP({ tick: 0, mutualBenefit: 10 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings[0].mutualBenefit).toBeGreaterThanOrEqual(10)
  })
  it('mutualBenefit 上界不超过 85', () => {
    ;(sys as any).proceedings.push(makeP({ tick: 0, mutualBenefit: 85 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings[0].mutualBenefit).toBeLessThanOrEqual(85)
  })
  it('stabilityGain 上界不超过 65', () => {
    ;(sys as any).proceedings.push(makeP({ tick: 0, stabilityGain: 65 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings[0].stabilityGain).toBeLessThanOrEqual(65)
  })
  it('adjustmentDepth 上界不超过 75', () => {
    ;(sys as any).proceedings.push(makeP({ tick: 0, adjustmentDepth: 75 }))
    vi.restoreAllMocks(); vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings[0].adjustmentDepth).toBeLessThanOrEqual(75)
  })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('注入 18 条后 length 为 18', () => {
    for (let i = 0; i < 18; i++) { ;(sys as any).proceedings.push(makeP({ id: i + 1 })) }
    expect((sys as any).proceedings.length).toBe(18)
  })
  it('两实例各自管理独立 nextId', () => {
    const s2 = makeSys()
    expect((sys as any).nextId).toBe(1)
    expect((s2 as any).nextId).toBe(1)
  })
  it('duration 只在满足 CHECK_INTERVAL 时递增', () => {
    ;(sys as any).proceedings.push(makeP({ duration: 0, tick: 0 }))
    sys.update(1, {} as any, {} as any, 10)
    expect((sys as any).proceedings[0].duration).toBe(0)
    sys.update(1, {} as any, {} as any, CI)
    expect((sys as any).proceedings[0].duration).toBe(1)
  })
  it('清理后剩余记录数量正确', () => {
    const big = 88000 + CI + 1
    ;(sys as any).proceedings.push(makeP({ id: 1, tick: 0 }))
    ;(sys as any).proceedings.push(makeP({ id: 2, tick: big }))
    ;(sys as any).proceedings.push(makeP({ id: 3, tick: big }))
    sys.update(1, {} as any, {} as any, big)
    expect((sys as any).proceedings).toHaveLength(2)
  })
})
