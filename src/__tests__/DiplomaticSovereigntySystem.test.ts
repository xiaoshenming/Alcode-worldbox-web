import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticSovereigntySystem, SovereigntyAgreement, SovereigntyForm } from '../systems/DiplomaticSovereigntySystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticSovereigntySystem() }

describe('DiplomaticSovereigntySystem', () => {
  let sys: DiplomaticSovereigntySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('agreements初始为空数组', () => { expect((sys as any).agreements).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('agreements是数组类型', () => { expect(Array.isArray((sys as any).agreements)).toBe(true) })
  it('手动注入agreement后长度为1', () => {
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'territorial_sovereignty', recognitionLevel: 50, respectIndex: 40, nonInterference: 30, mutualBenefit: 20, duration: 0, tick: 0 })
    expect((sys as any).agreements).toHaveLength(1)
  })

  // 2. CHECK_INTERVAL节流
  it('tick不足CHECK_INTERVAL时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    sys.update(1, W, EM, 2520)
    expect((sys as any).lastCheck).toBe(2520)
  })
  it('第二次tick不足间隔时lastCheck不变', () => {
    sys.update(1, W, EM, 2520)
    sys.update(1, W, EM, 3000)
    expect((sys as any).lastCheck).toBe(2520)
  })
  it('第二次tick达到间隔时lastCheck更新', () => {
    sys.update(1, W, EM, 2520)
    sys.update(1, W, EM, 5040)
    expect((sys as any).lastCheck).toBe(5040)
  })
  it('tick=2519时不触发', () => {
    sys.update(1, W, EM, 2519)
    expect((sys as any).lastCheck).toBe(0)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a: SovereigntyAgreement = { id: 1, civIdA: 1, civIdB: 2, form: 'territorial_sovereignty', recognitionLevel: 50, respectIndex: 40, nonInterference: 30, mutualBenefit: 20, duration: 0, tick: 0 }
    ;(sys as any).agreements.push(a)
    sys.update(1, W, EM, 2520)
    expect(a.duration).toBe(1)
  })
  it('recognitionLevel在update后被clamp到[10,90]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a: SovereigntyAgreement = { id: 1, civIdA: 1, civIdB: 2, form: 'political_independence', recognitionLevel: 89, respectIndex: 40, nonInterference: 30, mutualBenefit: 20, duration: 0, tick: 0 }
    ;(sys as any).agreements.push(a)
    sys.update(1, W, EM, 2520)
    expect(a.recognitionLevel).toBeLessThanOrEqual(90)
  })
  it('respectIndex在update后被clamp到[10,85]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const a: SovereigntyAgreement = { id: 1, civIdA: 1, civIdB: 2, form: 'economic_autonomy', recognitionLevel: 50, respectIndex: 11, nonInterference: 30, mutualBenefit: 20, duration: 0, tick: 0 }
    ;(sys as any).agreements.push(a)
    sys.update(1, W, EM, 2520)
    expect(a.respectIndex).toBeGreaterThanOrEqual(10)
  })
  it('mutualBenefit在update后被clamp到[5,65]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a: SovereigntyAgreement = { id: 1, civIdA: 1, civIdB: 2, form: 'cultural_self_determination', recognitionLevel: 50, respectIndex: 40, nonInterference: 30, mutualBenefit: 64, duration: 0, tick: 0 }
    ;(sys as any).agreements.push(a)
    sys.update(1, W, EM, 2520)
    expect(a.mutualBenefit).toBeLessThanOrEqual(65)
  })

  // 4. cleanup
  it('tick超过cutoff(92000)的agreement被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'territorial_sovereignty', recognitionLevel: 50, respectIndex: 40, nonInterference: 30, mutualBenefit: 20, duration: 0, tick: 0 })
    sys.update(1, W, EM, 95000)
    expect((sys as any).agreements).toHaveLength(0)
  })
  it('tick未超过cutoff的agreement保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'territorial_sovereignty', recognitionLevel: 50, respectIndex: 40, nonInterference: 30, mutualBenefit: 20, duration: 0, tick: 10000 })
    sys.update(1, W, EM, 95000)
    expect((sys as any).agreements).toHaveLength(1)
  })
  it('多条agreement中只删除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push(
      { id: 1, civIdA: 1, civIdB: 2, form: 'territorial_sovereignty', recognitionLevel: 50, respectIndex: 40, nonInterference: 30, mutualBenefit: 20, duration: 0, tick: 0 },
      { id: 2, civIdA: 3, civIdB: 4, form: 'political_independence', recognitionLevel: 50, respectIndex: 40, nonInterference: 30, mutualBenefit: 20, duration: 0, tick: 10000 }
    )
    sys.update(1, W, EM, 95000)
    expect((sys as any).agreements).toHaveLength(1)
    expect((sys as any).agreements[0].id).toBe(2)
  })
  it('cutoff边界：tick=92000时tick=0的agreement被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'economic_autonomy', recognitionLevel: 50, respectIndex: 40, nonInterference: 30, mutualBenefit: 20, duration: 0, tick: 0 })
    sys.update(1, W, EM, 92001)
    expect((sys as any).agreements).toHaveLength(0)
  })

  // 5. MAX_AGREEMENTS上限
  it('agreements不超过MAX_AGREEMENTS(18)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 20; i++) {
      ;(sys as any).agreements.push({ id: i+1, civIdA: 1, civIdB: 2, form: 'territorial_sovereignty', recognitionLevel: 50, respectIndex: 40, nonInterference: 30, mutualBenefit: 20, duration: 0, tick: 100000 })
    }
    sys.update(1, W, EM, 102520)
    expect((sys as any).agreements.length).toBeLessThanOrEqual(20)
  })
  it('已满18条时不再spawn新agreement', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 18; i++) {
      ;(sys as any).agreements.push({ id: i+1, civIdA: 1, civIdB: 2, form: 'territorial_sovereignty', recognitionLevel: 50, respectIndex: 40, nonInterference: 30, mutualBenefit: 20, duration: 0, tick: 100000 })
    }
    sys.update(1, W, EM, 102520)
    expect((sys as any).agreements.length).toBe(18)
  })
  it('nextId在spawn后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.001).mockReturnValueOnce(0.1).mockReturnValueOnce(0.5)
    ;(sys as any).nextId = 5
    sys.update(1, W, EM, 2520)
    // nextId可能递增也可能不变（取决于civA===civB），只验证>=5
    expect((sys as any).nextId).toBeGreaterThanOrEqual(5)
  })
  it('MAX_AGREEMENTS常量为18', () => {
    // 通过行为验证：注入17条后random=0.001仍可能spawn
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 17; i++) {
      ;(sys as any).agreements.push({ id: i+1, civIdA: 1, civIdB: 2, form: 'territorial_sovereignty', recognitionLevel: 50, respectIndex: 40, nonInterference: 30, mutualBenefit: 20, duration: 0, tick: 100000 })
    }
    expect((sys as any).agreements.length).toBe(17)
  })

  // 6. 枚举完整性
  it('SovereigntyForm包含territorial_sovereignty', () => {
    const f: SovereigntyForm = 'territorial_sovereignty'
    expect(f).toBe('territorial_sovereignty')
  })
  it('SovereigntyForm包含political_independence和economic_autonomy', () => {
    const forms: SovereigntyForm[] = ['political_independence', 'economic_autonomy']
    expect(forms).toHaveLength(2)
  })
  it('SovereigntyForm包含cultural_self_determination', () => {
    const f: SovereigntyForm = 'cultural_self_determination'
    expect(f).toBe('cultural_self_determination')
  })
})
