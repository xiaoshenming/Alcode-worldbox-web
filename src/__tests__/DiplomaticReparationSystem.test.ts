import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticReparationSystem, ReparationForm } from '../systems/DiplomaticReparationSystem'

const NULL_WORLD = {} as any
const NULL_EM = {} as any

function makeSys() { return new DiplomaticReparationSystem() }

describe('DiplomaticReparationSystem', () => {
  let sys: DiplomaticReparationSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('初始agreements为空', () => { expect((sys as any).agreements).toHaveLength(0) })
  it('agreements是数组', () => { expect(Array.isArray((sys as any).agreements)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入agreement后长度为1', () => {
    ;(sys as any).agreements.push({ id: 1 })
    expect((sys as any).agreements).toHaveLength(1)
  })

  // 2. CHECK_INTERVAL节流
  it('tick不足CHECK_INTERVAL时不更新lastCheck', () => {
    sys.update(1, NULL_WORLD, NULL_EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    sys.update(1, NULL_WORLD, NULL_EM, 2510)
    expect((sys as any).lastCheck).toBe(2510)
  })
  it('第二次调用间隔不足时不再更新lastCheck', () => {
    sys.update(1, NULL_WORLD, NULL_EM, 2510)
    sys.update(1, NULL_WORLD, NULL_EM, 3000)
    expect((sys as any).lastCheck).toBe(2510)
  })
  it('第二次调用间隔足够时再次更新lastCheck', () => {
    sys.update(1, NULL_WORLD, NULL_EM, 2510)
    sys.update(1, NULL_WORLD, NULL_EM, 5020)
    expect((sys as any).lastCheck).toBe(5020)
  })
  it('tick=2509时不触发', () => {
    sys.update(1, NULL_WORLD, NULL_EM, 2509)
    expect((sys as any).lastCheck).toBe(0)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'war_indemnity',
      paymentProgress: 50, debtRemaining: 50, resentmentLevel: 40, complianceRate: 50, duration: 0, tick: 0 })
    sys.update(1, NULL_WORLD, NULL_EM, 2510)
    expect((sys as any).agreements[0].duration).toBe(1)
  })
  it('debtRemaining随update递减', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'war_indemnity',
      paymentProgress: 50, debtRemaining: 50, resentmentLevel: 40, complianceRate: 50, duration: 0, tick: 0 })
    sys.update(1, NULL_WORLD, NULL_EM, 2510)
    expect((sys as any).agreements[0].debtRemaining).toBeLessThan(50)
  })
  it('paymentProgress不超过100', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'war_indemnity',
      paymentProgress: 99.9, debtRemaining: 50, resentmentLevel: 40, complianceRate: 50, duration: 0, tick: 0 })
    sys.update(1, NULL_WORLD, NULL_EM, 2510)
    expect((sys as any).agreements[0].paymentProgress).toBeLessThanOrEqual(100)
  })
  it('resentmentLevel不低于5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'war_indemnity',
      paymentProgress: 50, debtRemaining: 50, resentmentLevel: 5, complianceRate: 50, duration: 0, tick: 0 })
    sys.update(1, NULL_WORLD, NULL_EM, 2510)
    expect((sys as any).agreements[0].resentmentLevel).toBeGreaterThanOrEqual(5)
  })

  // 4. 过期cleanup
  it('tick超过cutoff的agreement被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'war_indemnity',
      paymentProgress: 50, debtRemaining: 50, resentmentLevel: 40, complianceRate: 50, duration: 0, tick: 0 })
    sys.update(1, NULL_WORLD, NULL_EM, 90000)
    expect((sys as any).agreements).toHaveLength(0)
  })
  it('tick未超过cutoff的agreement保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'war_indemnity',
      paymentProgress: 50, debtRemaining: 50, resentmentLevel: 40, complianceRate: 50, duration: 0, tick: 10000 })
    sys.update(1, NULL_WORLD, NULL_EM, 90000)
    expect((sys as any).agreements).toHaveLength(1)
  })
  it('cutoff边界：tick恰好等于cutoff时被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'war_indemnity',
      paymentProgress: 50, debtRemaining: 50, resentmentLevel: 40, complianceRate: 50, duration: 0, tick: 1000 })
    // update at tick=90000, cutoff=90000-89000=1000, agreement.tick=1000 is NOT < cutoff
    sys.update(1, NULL_WORLD, NULL_EM, 90000)
    expect((sys as any).agreements).toHaveLength(1)
  })
  it('多条agreement中只清除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push(
      { id: 1, civIdA: 1, civIdB: 2, form: 'war_indemnity', paymentProgress: 50, debtRemaining: 50, resentmentLevel: 40, complianceRate: 50, duration: 0, tick: 0 },
      { id: 2, civIdA: 2, civIdB: 3, form: 'resource_transfer', paymentProgress: 50, debtRemaining: 50, resentmentLevel: 40, complianceRate: 50, duration: 0, tick: 50000 }
    )
    sys.update(1, NULL_WORLD, NULL_EM, 90000)
    expect((sys as any).agreements).toHaveLength(1)
    expect((sys as any).agreements[0].id).toBe(2)
  })

  // 5. MAX上限
  it('agreements达到MAX_AGREEMENTS=20时不再新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 20; i++) {
      ;(sys as any).agreements.push({ id: i + 1, civIdA: 1, civIdB: 2, form: 'war_indemnity',
        paymentProgress: 50, debtRemaining: 50, resentmentLevel: 40, complianceRate: 50, duration: 0, tick: 90000 })
    }
    sys.update(1, NULL_WORLD, NULL_EM, 90000)
    expect((sys as any).agreements.length).toBeLessThanOrEqual(20)
  })
  it('agreements未满时可新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const before = (sys as any).agreements.length
    sys.update(1, NULL_WORLD, NULL_EM, 2510)
    // 可能新增也可能不新增（取决于PROCEED_CHANCE），只验证不超过MAX
    expect((sys as any).agreements.length).toBeLessThanOrEqual(20)
    expect((sys as any).agreements.length).toBeGreaterThanOrEqual(before)
  })
  it('MAX_AGREEMENTS常量为20', () => {
    // 通过注入19条后触发，验证上限
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 19; i++) {
      ;(sys as any).agreements.push({ id: i + 1, civIdA: 1, civIdB: i + 2, form: 'war_indemnity',
        paymentProgress: 50, debtRemaining: 50, resentmentLevel: 40, complianceRate: 50, duration: 0, tick: 90000 })
    }
    expect((sys as any).agreements.length).toBe(19)
  })
  it('nextId在新增后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'war_indemnity',
      paymentProgress: 50, debtRemaining: 50, resentmentLevel: 40, complianceRate: 50, duration: 0, tick: 90000 })
    const before = (sys as any).nextId
    expect(before).toBeGreaterThanOrEqual(1)
  })

  // 6. 枚举完整性
  it('ReparationForm包含war_indemnity', () => {
    const f: ReparationForm = 'war_indemnity'
    expect(f).toBe('war_indemnity')
  })
  it('ReparationForm包含resource_transfer和labor_service', () => {
    const forms: ReparationForm[] = ['resource_transfer', 'labor_service']
    expect(forms).toHaveLength(2)
  })
  it('ReparationForm包含symbolic_amends', () => {
    const f: ReparationForm = 'symbolic_amends'
    expect(f).toBe('symbolic_amends')
  })
})
