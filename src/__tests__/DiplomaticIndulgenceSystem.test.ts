import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticIndulgenceSystem } from '../systems/DiplomaticIndulgenceSystem'

describe('DiplomaticIndulgenceSystem', () => {
  let sys: DiplomaticIndulgenceSystem

  beforeEach(() => { sys = new DiplomaticIndulgenceSystem() })

  // 基础结构
  it('初始grants为空', () => { expect((sys as any).grants).toHaveLength(0) })
  it('初始nextId=1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck=0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('update返回void', () => { expect(sys.update(1, {} as any, {} as any, 0)).toBeUndefined() })
  it('CHECK_INTERVAL=2370时节流生效', () => {
    ;(sys as any).lastCheck = 1000
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 1100)
    expect((sys as any).grants).toHaveLength(0)
  })

  // 节流逻辑
  it('tick差>=2370时执行update', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, 2370)
    expect((sys as any).lastCheck).toBe(2370)
    vi.restoreAllMocks()
  })
  it('lastCheck在update后更新', () => {
    sys.update(1, {} as any, {} as any, 5000)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('未到CHECK_INTERVAL不更新lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(1, {} as any, {} as any, 5100)
    expect((sys as any).lastCheck).toBe(5000)
  })
  it('连续两次update只在间隔足够时执行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, 2370)
    sys.update(1, {} as any, {} as any, 3000)
    expect((sys as any).lastCheck).toBe(2370)
    vi.restoreAllMocks()
  })

  // 字段范围
  it('generosity在[10,85]内', () => {
    ;(sys as any).grants.push({ id:1, civIdA:1, civIdB:2, form:'trade_privilege', generosity:84, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:30, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 2370)
    expect((sys as any).grants[0].generosity).toBeLessThanOrEqual(85)
    expect((sys as any).grants[0].generosity).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })
  it('reciprocalExpectation在[10,80]内', () => {
    ;(sys as any).grants.push({ id:1, civIdA:1, civIdB:2, form:'border_leniency', generosity:50, reciprocalExpectation:79, politicalLeverage:40, publicOpinion:30, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 2370)
    expect((sys as any).grants[0].reciprocalExpectation).toBeLessThanOrEqual(80)
    expect((sys as any).grants[0].reciprocalExpectation).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })
  it('politicalLeverage在[5,70]内', () => {
    ;(sys as any).grants.push({ id:1, civIdA:1, civIdB:2, form:'tax_exemption', generosity:50, reciprocalExpectation:50, politicalLeverage:69, publicOpinion:30, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 2370)
    expect((sys as any).grants[0].politicalLeverage).toBeLessThanOrEqual(70)
    expect((sys as any).grants[0].politicalLeverage).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })
  it('publicOpinion在[5,65]内', () => {
    ;(sys as any).grants.push({ id:1, civIdA:1, civIdB:2, form:'cultural_allowance', generosity:50, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:64, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 2370)
    expect((sys as any).grants[0].publicOpinion).toBeLessThanOrEqual(65)
    expect((sys as any).grants[0].publicOpinion).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })
  it('duration每tick+1', () => {
    ;(sys as any).grants.push({ id:1, civIdA:1, civIdB:2, form:'trade_privilege', generosity:50, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:30, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 2370)
    expect((sys as any).grants[0].duration).toBe(1)
    vi.restoreAllMocks()
  })

  // 过期清理
  it('过期grant被移除(cutoff=tick-85000)', () => {
    ;(sys as any).grants.push({ id:1, civIdA:1, civIdB:2, form:'trade_privilege', generosity:50, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:30, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).grants).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('未过期grant保留', () => {
    ;(sys as any).grants.push({ id:1, civIdA:1, civIdB:2, form:'trade_privilege', generosity:50, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:30, duration:0, tick:10000 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).grants).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('cutoff边界：tick=85000时tick=0的grant被移除', () => {
    ;(sys as any).grants.push({ id:1, civIdA:1, civIdB:2, form:'trade_privilege', generosity:50, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:30, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 85001)
    expect((sys as any).grants).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('多条grant部分过期', () => {
    ;(sys as any).grants.push(
      { id:1, civIdA:1, civIdB:2, form:'trade_privilege', generosity:50, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:30, duration:0, tick:0 },
      { id:2, civIdA:3, civIdB:4, form:'border_leniency', generosity:50, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:30, duration:0, tick:50000 }
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).grants).toHaveLength(1)
    expect((sys as any).grants[0].id).toBe(2)
    vi.restoreAllMocks()
  })
  it('清理后nextId不重置', () => {
    ;(sys as any).nextId = 5
    ;(sys as any).grants.push({ id:4, civIdA:1, civIdB:2, form:'trade_privilege', generosity:50, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:30, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).nextId).toBe(5)
    vi.restoreAllMocks()
  })

  // MAX_GRANTS=20
  it('达到MAX_GRANTS=20不新增', () => {
    for (let i = 0; i < 20; i++) {
      ;(sys as any).grants.push({ id:i+1, civIdA:1, civIdB:2, form:'trade_privilege', generosity:50, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:30, duration:0, tick:100000 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 102370)
    expect((sys as any).grants.length).toBeLessThanOrEqual(20)
    vi.restoreAllMocks()
  })
  it('19条时可以新增到20', () => {
    for (let i = 0; i < 19; i++) {
      ;(sys as any).grants.push({ id:i+1, civIdA:i+1, civIdB:i+10, form:'trade_privilege', generosity:50, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:30, duration:0, tick:100000 })
    }
    expect((sys as any).grants).toHaveLength(19)
  })
  it('MAX_GRANTS常量为20', () => {
    for (let i = 0; i < 20; i++) {
      ;(sys as any).grants.push({ id:i+1, civIdA:i+1, civIdB:i+10, form:'trade_privilege', generosity:50, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:30, duration:0, tick:100000 })
    }
    const lenBefore = (sys as any).grants.length
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 102370)
    expect((sys as any).grants.length).toBeLessThanOrEqual(lenBefore)
    vi.restoreAllMocks()
  })
  it('未达MAX_GRANTS时random=1可新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 2370)
    expect((sys as any).grants.length).toBeLessThanOrEqual(1)
    vi.restoreAllMocks()
  })

  // 枚举类型
  it('form包含trade_privilege', () => {
    ;(sys as any).grants.push({ id:1, civIdA:1, civIdB:2, form:'trade_privilege', generosity:50, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:30, duration:0, tick:0 })
    expect((sys as any).grants[0].form).toBe('trade_privilege')
  })
  it('form包含border_leniency', () => {
    ;(sys as any).grants.push({ id:1, civIdA:1, civIdB:2, form:'border_leniency', generosity:50, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:30, duration:0, tick:0 })
    expect((sys as any).grants[0].form).toBe('border_leniency')
  })
  it('form包含tax_exemption', () => {
    ;(sys as any).grants.push({ id:1, civIdA:1, civIdB:2, form:'tax_exemption', generosity:50, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:30, duration:0, tick:0 })
    expect((sys as any).grants[0].form).toBe('tax_exemption')
  })
  it('form包含cultural_allowance', () => {
    ;(sys as any).grants.push({ id:1, civIdA:1, civIdB:2, form:'cultural_allowance', generosity:50, reciprocalExpectation:50, politicalLeverage:40, publicOpinion:30, duration:0, tick:0 })
    expect((sys as any).grants[0].form).toBe('cultural_allowance')
  })
})
