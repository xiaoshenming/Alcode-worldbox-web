import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticRestitutionSystem, RestitutionForm } from '../systems/DiplomaticRestitutionSystem'

const NULL_WORLD = {} as any
const NULL_EM = {} as any

function makeSys() { return new DiplomaticRestitutionSystem() }

describe('DiplomaticRestitutionSystem', () => {
  let sys: DiplomaticRestitutionSystem
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
  it('tick不足CHECK_INTERVAL=2490时不更新lastCheck', () => {
    sys.update(1, NULL_WORLD, NULL_EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到2490时更新lastCheck', () => {
    sys.update(1, NULL_WORLD, NULL_EM, 2490)
    expect((sys as any).lastCheck).toBe(2490)
  })
  it('第二次间隔不足时不更新', () => {
    sys.update(1, NULL_WORLD, NULL_EM, 2490)
    sys.update(1, NULL_WORLD, NULL_EM, 3000)
    expect((sys as any).lastCheck).toBe(2490)
  })
  it('第二次间隔足够时再次更新', () => {
    sys.update(1, NULL_WORLD, NULL_EM, 2490)
    sys.update(1, NULL_WORLD, NULL_EM, 4980)
    expect((sys as any).lastCheck).toBe(4980)
  })
  it('tick=2489时不触发', () => {
    sys.update(1, NULL_WORLD, NULL_EM, 2489)
    expect((sys as any).lastCheck).toBe(0)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'territorial_return',
      complianceRate: 50, fairnessIndex: 40, publicApproval: 40, enforcementStrength: 30, duration: 0, tick: 0 })
    sys.update(1, NULL_WORLD, NULL_EM, 2490)
    expect((sys as any).agreements[0].duration).toBe(1)
  })
  it('complianceRate不超过85', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'territorial_return',
      complianceRate: 84.9, fairnessIndex: 40, publicApproval: 40, enforcementStrength: 30, duration: 0, tick: 0 })
    sys.update(1, NULL_WORLD, NULL_EM, 2490)
    expect((sys as any).agreements[0].complianceRate).toBeLessThanOrEqual(85)
  })
  it('publicApproval不低于5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'territorial_return',
      complianceRate: 50, fairnessIndex: 40, publicApproval: 5, enforcementStrength: 30, duration: 0, tick: 0 })
    sys.update(1, NULL_WORLD, NULL_EM, 2490)
    expect((sys as any).agreements[0].publicApproval).toBeGreaterThanOrEqual(5)
  })
  it('enforcementStrength不低于5', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'territorial_return',
      complianceRate: 50, fairnessIndex: 40, publicApproval: 40, enforcementStrength: 5, duration: 0, tick: 0 })
    sys.update(1, NULL_WORLD, NULL_EM, 2490)
    expect((sys as any).agreements[0].enforcementStrength).toBeGreaterThanOrEqual(5)
  })

  // 4. 过期cleanup
  it('tick超过cutoff=86000的agreement被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'territorial_return',
      complianceRate: 50, fairnessIndex: 40, publicApproval: 40, enforcementStrength: 30, duration: 0, tick: 0 })
    sys.update(1, NULL_WORLD, NULL_EM, 87000)
    expect((sys as any).agreements).toHaveLength(0)
  })
  it('tick未超过cutoff的agreement保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'territorial_return',
      complianceRate: 50, fairnessIndex: 40, publicApproval: 40, enforcementStrength: 30, duration: 0, tick: 10000 })
    sys.update(1, NULL_WORLD, NULL_EM, 87000)
    expect((sys as any).agreements).toHaveLength(1)
  })
  it('cutoff边界：agreement.tick恰好等于cutoff时保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push({ id: 1, civIdA: 1, civIdB: 2, form: 'territorial_return',
      complianceRate: 50, fairnessIndex: 40, publicApproval: 40, enforcementStrength: 30, duration: 0, tick: 1000 })
    // update at 87000, cutoff=87000-86000=1000, agreement.tick=1000 NOT < cutoff
    sys.update(1, NULL_WORLD, NULL_EM, 87000)
    expect((sys as any).agreements).toHaveLength(1)
  })
  it('多条agreement中只清除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push(
      { id: 1, civIdA: 1, civIdB: 2, form: 'territorial_return', complianceRate: 50, fairnessIndex: 40, publicApproval: 40, enforcementStrength: 30, duration: 0, tick: 0 },
      { id: 2, civIdA: 2, civIdB: 3, form: 'resource_compensation', complianceRate: 50, fairnessIndex: 40, publicApproval: 40, enforcementStrength: 30, duration: 0, tick: 50000 }
    )
    sys.update(1, NULL_WORLD, NULL_EM, 87000)
    expect((sys as any).agreements).toHaveLength(1)
    expect((sys as any).agreements[0].id).toBe(2)
  })

  // 5. MAX上限
  it('agreements达到MAX_AGREEMENTS=20时不再新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 20; i++) {
      ;(sys as any).agreements.push({ id: i + 1, civIdA: 1, civIdB: 2, form: 'territorial_return',
        complianceRate: 50, fairnessIndex: 40, publicApproval: 40, enforcementStrength: 30, duration: 0, tick: 87000 })
    }
    sys.update(1, NULL_WORLD, NULL_EM, 87000)
    expect((sys as any).agreements.length).toBeLessThanOrEqual(20)
  })
  it('agreements未满时长度不超过MAX', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    sys.update(1, NULL_WORLD, NULL_EM, 2490)
    expect((sys as any).agreements.length).toBeLessThanOrEqual(20)
  })
  it('注入19条后长度为19', () => {
    for (let i = 0; i < 19; i++) {
      ;(sys as any).agreements.push({ id: i + 1, civIdA: 1, civIdB: i + 2, form: 'territorial_return',
        complianceRate: 50, fairnessIndex: 40, publicApproval: 40, enforcementStrength: 30, duration: 0, tick: 87000 })
    }
    expect((sys as any).agreements.length).toBe(19)
  })
  it('nextId初始值为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  // 6. 枚举完整性
  it('RestitutionForm包含territorial_return', () => {
    const f: RestitutionForm = 'territorial_return'
    expect(f).toBe('territorial_return')
  })
  it('RestitutionForm包含resource_compensation和rights_restoration', () => {
    const forms: RestitutionForm[] = ['resource_compensation', 'rights_restoration']
    expect(forms).toHaveLength(2)
  })
  it('RestitutionForm包含cultural_repatriation', () => {
    const f: RestitutionForm = 'cultural_repatriation'
    expect(f).toBe('cultural_repatriation')
  })
})
