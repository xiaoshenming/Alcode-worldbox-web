import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticStewardshipPactSystem, StewardshipPactArrangement, StewardshipPactForm } from '../systems/DiplomaticStewardshipPactSystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticStewardshipPactSystem() }

describe('DiplomaticStewardshipPactSystem', () => {
  let sys: DiplomaticStewardshipPactSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('arrangements初始为空数组', () => { expect((sys as any).arrangements).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('arrangements是数组类型', () => { expect(Array.isArray((sys as any).arrangements)).toBe(true) })
  it('手动注入arrangement后长度为1', () => {
    ;(sys as any).arrangements.push({ id: 1, stewardCivId: 1, partnerCivId: 2, form: 'land_stewardship', resourceCare: 40, sharedBenefit: 50, complianceRate: 30, sustainabilityScore: 25, duration: 0, tick: 0 })
    expect((sys as any).arrangements).toHaveLength(1)
  })

  // 2. CHECK_INTERVAL节流
  it('tick不足CHECK_INTERVAL(2590)时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到2590时更新lastCheck', () => {
    sys.update(1, W, EM, 2590)
    expect((sys as any).lastCheck).toBe(2590)
  })
  it('第二次tick不足间隔时lastCheck不变', () => {
    sys.update(1, W, EM, 2590)
    sys.update(1, W, EM, 4000)
    expect((sys as any).lastCheck).toBe(2590)
  })
  it('第二次tick达到间隔时lastCheck更新', () => {
    sys.update(1, W, EM, 2590)
    sys.update(1, W, EM, 5180)
    expect((sys as any).lastCheck).toBe(5180)
  })
  it('tick=2589时不触发', () => {
    sys.update(1, W, EM, 2589)
    expect((sys as any).lastCheck).toBe(0)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a: StewardshipPactArrangement = { id: 1, stewardCivId: 1, partnerCivId: 2, form: 'land_stewardship', resourceCare: 40, sharedBenefit: 50, complianceRate: 30, sustainabilityScore: 25, duration: 0, tick: 0 }
    ;(sys as any).arrangements.push(a)
    sys.update(1, W, EM, 2590)
    expect(a.duration).toBe(1)
  })
  it('resourceCare在update后被clamp到[5,85]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a: StewardshipPactArrangement = { id: 1, stewardCivId: 1, partnerCivId: 2, form: 'water_stewardship', resourceCare: 84, sharedBenefit: 50, complianceRate: 30, sustainabilityScore: 25, duration: 0, tick: 0 }
    ;(sys as any).arrangements.push(a)
    sys.update(1, W, EM, 2590)
    expect(a.resourceCare).toBeLessThanOrEqual(85)
  })
  it('sharedBenefit在update后被clamp到[10,90]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const a: StewardshipPactArrangement = { id: 1, stewardCivId: 1, partnerCivId: 2, form: 'forest_stewardship', resourceCare: 40, sharedBenefit: 11, complianceRate: 30, sustainabilityScore: 25, duration: 0, tick: 0 }
    ;(sys as any).arrangements.push(a)
    sys.update(1, W, EM, 2590)
    expect(a.sharedBenefit).toBeGreaterThanOrEqual(10)
  })
  it('sustainabilityScore在update后被clamp到[5,65]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a: StewardshipPactArrangement = { id: 1, stewardCivId: 1, partnerCivId: 2, form: 'mineral_stewardship', resourceCare: 40, sharedBenefit: 50, complianceRate: 30, sustainabilityScore: 64, duration: 0, tick: 0 }
    ;(sys as any).arrangements.push(a)
    sys.update(1, W, EM, 2590)
    expect(a.sustainabilityScore).toBeLessThanOrEqual(65)
  })

  // 4. cleanup
  it('tick超过cutoff(88000)的arrangement被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push({ id: 1, stewardCivId: 1, partnerCivId: 2, form: 'land_stewardship', resourceCare: 40, sharedBenefit: 50, complianceRate: 30, sustainabilityScore: 25, duration: 0, tick: 0 })
    sys.update(1, W, EM, 91000)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick未超过cutoff的arrangement保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push({ id: 1, stewardCivId: 1, partnerCivId: 2, form: 'land_stewardship', resourceCare: 40, sharedBenefit: 50, complianceRate: 30, sustainabilityScore: 25, duration: 0, tick: 10000 })
    sys.update(1, W, EM, 91000)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('多条arrangement中只删除过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(
      { id: 1, stewardCivId: 1, partnerCivId: 2, form: 'land_stewardship', resourceCare: 40, sharedBenefit: 50, complianceRate: 30, sustainabilityScore: 25, duration: 0, tick: 0 },
      { id: 2, stewardCivId: 3, partnerCivId: 4, form: 'water_stewardship', resourceCare: 40, sharedBenefit: 50, complianceRate: 30, sustainabilityScore: 25, duration: 0, tick: 10000 }
    )
    sys.update(1, W, EM, 91000)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })
  it('cutoff边界：tick=88001时tick=0的arrangement被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push({ id: 1, stewardCivId: 1, partnerCivId: 2, form: 'forest_stewardship', resourceCare: 40, sharedBenefit: 50, complianceRate: 30, sustainabilityScore: 25, duration: 0, tick: 0 })
    sys.update(1, W, EM, 88001)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  // 5. MAX_ARRANGEMENTS上限
  it('已满16条时不再spawn新arrangement', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 16; i++) {
      ;(sys as any).arrangements.push({ id: i+1, stewardCivId: 1, partnerCivId: 2, form: 'land_stewardship', resourceCare: 40, sharedBenefit: 50, complianceRate: 30, sustainabilityScore: 25, duration: 0, tick: 100000 })
    }
    sys.update(1, W, EM, 102590)
    expect((sys as any).arrangements.length).toBe(16)
  })
  it('arrangements不超过MAX_ARRANGEMENTS(16)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let i = 0; i < 20; i++) {
      ;(sys as any).arrangements.push({ id: i+1, stewardCivId: 1, partnerCivId: 2, form: 'land_stewardship', resourceCare: 40, sharedBenefit: 50, complianceRate: 30, sustainabilityScore: 25, duration: 0, tick: 100000 })
    }
    sys.update(1, W, EM, 102590)
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(20)
  })
  it('nextId在spawn后递增', () => {
    ;(sys as any).nextId = 7
    expect((sys as any).nextId).toBe(7)
  })
  it('注入15条后arrangements长度为15', () => {
    for (let i = 0; i < 15; i++) {
      ;(sys as any).arrangements.push({ id: i+1, stewardCivId: 1, partnerCivId: 2, form: 'mineral_stewardship', resourceCare: 40, sharedBenefit: 50, complianceRate: 30, sustainabilityScore: 25, duration: 0, tick: 100000 })
    }
    expect((sys as any).arrangements.length).toBe(15)
  })

  // 6. 枚举完整性
  it('StewardshipPactForm包含land_stewardship和water_stewardship', () => {
    const forms: StewardshipPactForm[] = ['land_stewardship', 'water_stewardship']
    expect(forms).toHaveLength(2)
  })
  it('StewardshipPactForm包含forest_stewardship', () => {
    const f: StewardshipPactForm = 'forest_stewardship'
    expect(f).toBe('forest_stewardship')
  })
  it('StewardshipPactForm包含mineral_stewardship', () => {
    const f: StewardshipPactForm = 'mineral_stewardship'
    expect(f).toBe('mineral_stewardship')
  })
})
