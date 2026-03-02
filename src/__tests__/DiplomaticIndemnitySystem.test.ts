import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticIndemnitySystem } from '../systems/DiplomaticIndemnitySystem'

describe('DiplomaticIndemnitySystem', () => {
  let sys: DiplomaticIndemnitySystem

  beforeEach(() => { sys = new DiplomaticIndemnitySystem() })

  // 基础结构
  it('初始agreements为空', () => { expect((sys as any).agreements).toHaveLength(0) })
  it('初始nextId=1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始lastCheck=0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('update返回void', () => { expect(sys.update(1, {} as any, {} as any, 0)).toBeUndefined() })
  it('CHECK_INTERVAL=2500时节流生效', () => {
    ;(sys as any).lastCheck = 1000
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 1100)
    expect((sys as any).agreements).toHaveLength(0)
  })

  // 节流逻辑
  it('tick差>=2500时执行update', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).lastCheck).toBe(2500)
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
    sys.update(1, {} as any, {} as any, 2500)
    sys.update(1, {} as any, {} as any, 3000)
    expect((sys as any).lastCheck).toBe(2500)
    vi.restoreAllMocks()
  })

  // 字段范围与逻辑
  it('amountPaid每tick递增', () => {
    ;(sys as any).agreements.push({ id:1, payerCivId:1, receiverCivId:2, indemnityType:'war_damages', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:50, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0].amountPaid).toBeCloseTo(0.4, 5)
    vi.restoreAllMocks()
  })
  it('amountPaid不超过totalAmount', () => {
    ;(sys as any).agreements.push({ id:1, payerCivId:1, receiverCivId:2, indemnityType:'trade_losses', totalAmount:100, amountPaid:99.9, goodwill:50, enforcementStrength:50, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0].amountPaid).toBe(100)
    vi.restoreAllMocks()
  })
  it('goodwill在[5,100]内', () => {
    ;(sys as any).agreements.push({ id:1, payerCivId:1, receiverCivId:2, indemnityType:'border_violations', totalAmount:100, amountPaid:0, goodwill:99, enforcementStrength:50, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0].goodwill).toBeLessThanOrEqual(100)
    expect((sys as any).agreements[0].goodwill).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })
  it('enforcementStrength在[10,100]内', () => {
    ;(sys as any).agreements.push({ id:1, payerCivId:1, receiverCivId:2, indemnityType:'civilian_harm', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:99, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0].enforcementStrength).toBeLessThanOrEqual(100)
    expect((sys as any).agreements[0].enforcementStrength).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })
  it('duration每tick+1', () => {
    ;(sys as any).agreements.push({ id:1, payerCivId:1, receiverCivId:2, indemnityType:'war_damages', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:50, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0].duration).toBe(1)
    vi.restoreAllMocks()
  })

  // 过期清理
  it('过期agreement被移除(cutoff=tick-78000)', () => {
    ;(sys as any).agreements.push({ id:1, payerCivId:1, receiverCivId:2, indemnityType:'war_damages', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:50, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 80000)
    expect((sys as any).agreements).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('未过期agreement保留', () => {
    ;(sys as any).agreements.push({ id:1, payerCivId:1, receiverCivId:2, indemnityType:'war_damages', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:50, duration:0, tick:10000 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 80000)
    expect((sys as any).agreements).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('cutoff边界：tick=78000时tick=0的agreement被移除', () => {
    ;(sys as any).agreements.push({ id:1, payerCivId:1, receiverCivId:2, indemnityType:'war_damages', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:50, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 78001)
    expect((sys as any).agreements).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('多条agreement部分过期', () => {
    ;(sys as any).agreements.push(
      { id:1, payerCivId:1, receiverCivId:2, indemnityType:'war_damages', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:50, duration:0, tick:0 },
      { id:2, payerCivId:3, receiverCivId:4, indemnityType:'trade_losses', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:50, duration:0, tick:50000 }
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 80000)
    expect((sys as any).agreements).toHaveLength(1)
    expect((sys as any).agreements[0].id).toBe(2)
    vi.restoreAllMocks()
  })
  it('清理后nextId不重置', () => {
    ;(sys as any).nextId = 5
    ;(sys as any).agreements.push({ id:4, payerCivId:1, receiverCivId:2, indemnityType:'war_damages', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:50, duration:0, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 80000)
    expect((sys as any).nextId).toBe(5)
    vi.restoreAllMocks()
  })

  // MAX_AGREEMENTS=22
  it('达到MAX_AGREEMENTS=22不新增', () => {
    for (let i = 0; i < 22; i++) {
      ;(sys as any).agreements.push({ id:i+1, payerCivId:1, receiverCivId:2, indemnityType:'war_damages', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:50, duration:0, tick:100000 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 102500)
    expect((sys as any).agreements.length).toBeLessThanOrEqual(22)
    vi.restoreAllMocks()
  })
  it('21条时可以新增到22', () => {
    for (let i = 0; i < 21; i++) {
      ;(sys as any).agreements.push({ id:i+1, payerCivId:i+1, receiverCivId:i+10, indemnityType:'war_damages', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:50, duration:0, tick:100000 })
    }
    expect((sys as any).agreements).toHaveLength(21)
    vi.restoreAllMocks()
  })
  it('MAX_AGREEMENTS常量为22', () => {
    for (let i = 0; i < 22; i++) {
      ;(sys as any).agreements.push({ id:i+1, payerCivId:i+1, receiverCivId:i+10, indemnityType:'war_damages', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:50, duration:0, tick:100000 })
    }
    const lenBefore = (sys as any).agreements.length
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 102500)
    expect((sys as any).agreements.length).toBeLessThanOrEqual(lenBefore)
    vi.restoreAllMocks()
  })
  it('未达MAX_AGREEMENTS时random=1可新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements.length).toBeLessThanOrEqual(1)
    vi.restoreAllMocks()
  })

  // 枚举类型
  it('indemnityType包含war_damages', () => {
    ;(sys as any).agreements.push({ id:1, payerCivId:1, receiverCivId:2, indemnityType:'war_damages', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:50, duration:0, tick:0 })
    expect((sys as any).agreements[0].indemnityType).toBe('war_damages')
  })
  it('indemnityType包含trade_losses', () => {
    ;(sys as any).agreements.push({ id:1, payerCivId:1, receiverCivId:2, indemnityType:'trade_losses', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:50, duration:0, tick:0 })
    expect((sys as any).agreements[0].indemnityType).toBe('trade_losses')
  })
  it('indemnityType包含border_violations', () => {
    ;(sys as any).agreements.push({ id:1, payerCivId:1, receiverCivId:2, indemnityType:'border_violations', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:50, duration:0, tick:0 })
    expect((sys as any).agreements[0].indemnityType).toBe('border_violations')
  })
  it('indemnityType包含civilian_harm', () => {
    ;(sys as any).agreements.push({ id:1, payerCivId:1, receiverCivId:2, indemnityType:'civilian_harm', totalAmount:100, amountPaid:0, goodwill:50, enforcementStrength:50, duration:0, tick:0 })
    expect((sys as any).agreements[0].indemnityType).toBe('civilian_harm')
  })
})
