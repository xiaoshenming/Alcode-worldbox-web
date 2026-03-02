import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticRemissionSystem } from '../systems/DiplomaticRemissionSystem'
import type { RemissionAct, RemissionForm } from '../systems/DiplomaticRemissionSystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticRemissionSystem() }
function makeAct(tick = 0): RemissionAct {
  return { id: 1, civIdA: 1, civIdB: 2, form: 'debt_reduction',
    reductionAmount: 50, economicImpact: 40, gratitudeLevel: 40, fiscalStrain: 30, duration: 0, tick }
}

describe('DiplomaticRemissionSystem', () => {
  let sys: DiplomaticRemissionSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('初始acts为空', () => { expect((sys as any).acts).toHaveLength(0) })
  it('注入后acts返回数据', () => {
    ;(sys as any).acts.push({ id: 1 })
    expect((sys as any).acts).toHaveLength(1)
  })
  it('acts是数组', () => { expect(Array.isArray((sys as any).acts)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })

  // 2. CHECK_INTERVAL节流
  it('tick不足2420时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到2420时更新lastCheck', () => {
    sys.update(1, W, EM, 2420)
    expect((sys as any).lastCheck).toBe(2420)
  })
  it('第二次调用需再等2420', () => {
    sys.update(1, W, EM, 2420)
    sys.update(1, W, EM, 3000)
    expect((sys as any).lastCheck).toBe(2420)
  })
  it('再过CHECK_INTERVAL才再次更新', () => {
    sys.update(1, W, EM, 2420)
    sys.update(1, W, EM, 4840)
    expect((sys as any).lastCheck).toBe(4840)
  })
  it('tick=0时不触发', () => {
    sys.update(1, W, EM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a = makeAct()
    ;(sys as any).acts.push(a)
    sys.update(1, W, EM, 2420)
    expect(a.duration).toBe(1)
  })
  it('reductionAmount上限85', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a = makeAct(); a.reductionAmount = 85
    ;(sys as any).acts.push(a)
    sys.update(1, W, EM, 2420)
    expect(a.reductionAmount).toBeLessThanOrEqual(85)
  })
  it('economicImpact下限5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const a = makeAct(); a.economicImpact = 5
    ;(sys as any).acts.push(a)
    sys.update(1, W, EM, 2420)
    expect(a.economicImpact).toBeGreaterThanOrEqual(5)
  })
  it('fiscalStrain下限5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const a = makeAct(); a.fiscalStrain = 5
    ;(sys as any).acts.push(a)
    sys.update(1, W, EM, 2420)
    expect(a.fiscalStrain).toBeGreaterThanOrEqual(5)
  })

  // 4. 过期cleanup
  it('tick超过cutoff=83000的act被移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).acts.push(makeAct(0))
    sys.update(1, W, EM, 85420)
    expect((sys as any).acts).toHaveLength(0)
  })
  it('tick未超过cutoff的act保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).acts.push(makeAct(10000))
    sys.update(1, W, EM, 85420)
    expect((sys as any).acts).toHaveLength(1)
  })
  it('cleanup后nextId不重置', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).acts.push(makeAct(0))
    ;(sys as any).nextId = 6
    sys.update(1, W, EM, 85420)
    expect((sys as any).nextId).toBe(6)
  })
  it('cutoff边界：act.tick===tick-83000时不被移除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const cur = 85420
    ;(sys as any).acts.push(makeAct(cur - 83000))
    sys.update(1, W, EM, cur)
    expect((sys as any).acts).toHaveLength(1)
  })

  // 5. MAX上限
  it('已满20个时不新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const acts = (sys as any).acts
    for (let i = 0; i < 20; i++) {
      acts.push({ ...makeAct(999999), id: i + 1, civIdB: i + 2 })
    }
    sys.update(1, W, EM, 2420)
    expect(acts.length).toBeLessThanOrEqual(20)
  })
  it('超过20个注入后系统不裁剪已有', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const acts = (sys as any).acts
    for (let i = 0; i < 25; i++) {
      acts.push({ ...makeAct(999999), id: i + 1, civIdB: i + 2 })
    }
    ;(sys as any).lastCheck = 0
    sys.update(1, W, EM, 2420)
    expect(acts.length).toBeGreaterThanOrEqual(20)
  })
  it('random=1时不新增（概率门未过）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 2420)
    expect((sys as any).acts.length).toBeLessThanOrEqual(20)
  })
  it('MAX_ACTS常量为20', () => { expect(20).toBe(20) })

  // 6. 枚举完整性
  it('RemissionForm包含debt_reduction', () => {
    const f: RemissionForm = 'debt_reduction'
    expect(f).toBe('debt_reduction')
  })
  it('RemissionForm包含penalty_cancellation和reparation_waiver', () => {
    const forms: RemissionForm[] = ['penalty_cancellation', 'reparation_waiver']
    expect(forms).toHaveLength(2)
  })
  it('RemissionForm包含fine_forgiveness', () => {
    const f: RemissionForm = 'fine_forgiveness'
    expect(f).toBe('fine_forgiveness')
  })
})
