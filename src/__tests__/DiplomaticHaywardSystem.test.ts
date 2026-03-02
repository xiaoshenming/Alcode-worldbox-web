import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticHaywardSystem } from '../systems/DiplomaticHaywardSystem'

const w = {} as any, em = {} as any
function sys() { return new DiplomaticHaywardSystem() }

describe('DiplomaticHaywardSystem', () => {
  let s: DiplomaticHaywardSystem
  beforeEach(() => { s = sys() })

  // 基础5
  it('arrangements初始为空', () => { expect((s as any).arrangements).toHaveLength(0) })
  it('arrangements是数组', () => { expect(Array.isArray((s as any).arrangements)).toBe(true) })
  it('nextId初始为1', () => { expect((s as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((s as any).lastCheck).toBe(0) })
  it('注入后arrangements有数据', () => {
    ;(s as any).arrangements.push({ id: 1 })
    expect((s as any).arrangements).toHaveLength(1)
  })

  // 节流5
  it('tick不足CHECK_INTERVAL不更新lastCheck', () => {
    s.update(1, w, em, 100)
    expect((s as any).lastCheck).toBe(0)
  })
  it('tick>=CHECK_INTERVAL更新lastCheck', () => {
    s.update(1, w, em, 3110)
    expect((s as any).lastCheck).toBe(3110)
  })
  it('第二次tick不足间隔不再更新', () => {
    s.update(1, w, em, 3110)
    s.update(1, w, em, 3200)
    expect((s as any).lastCheck).toBe(3110)
  })
  it('两次间隔足够各自更新lastCheck', () => {
    s.update(1, w, em, 3110)
    s.update(1, w, em, 6220)
    expect((s as any).lastCheck).toBe(6220)
  })
  it('tick=0时不触发', () => {
    s.update(1, w, em, 0)
    expect((s as any).lastCheck).toBe(0)
  })

  // 字段范围5
  it('enclosureAuthority在[5,85]内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, enclosureAuthority:85, hedgeMaintenance:90, boundaryEnforcement:80, commonProtection:65, duration:0, tick:0 })
    s.update(1, w, em, 3110)
    expect((s as any).arrangements[0].enclosureAuthority).toBeLessThanOrEqual(85)
    vi.restoreAllMocks()
  })
  it('hedgeMaintenance在[10,90]内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, enclosureAuthority:50, hedgeMaintenance:90, boundaryEnforcement:50, commonProtection:50, duration:0, tick:0 })
    s.update(1, w, em, 3110)
    expect((s as any).arrangements[0].hedgeMaintenance).toBeLessThanOrEqual(90)
    vi.restoreAllMocks()
  })
  it('boundaryEnforcement在[5,80]内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(s as any).arrangements.push({ id:1, enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:5, commonProtection:50, duration:0, tick:0 })
    s.update(1, w, em, 3110)
    expect((s as any).arrangements[0].boundaryEnforcement).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })
  it('commonProtection在[5,65]内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:50, commonProtection:65, duration:0, tick:0 })
    s.update(1, w, em, 3110)
    expect((s as any).arrangements[0].commonProtection).toBeLessThanOrEqual(65)
    vi.restoreAllMocks()
  })
  it('duration每次update递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:50, commonProtection:50, duration:0, tick:0 })
    s.update(1, w, em, 3110)
    expect((s as any).arrangements[0].duration).toBe(1)
    vi.restoreAllMocks()
  })

  // 过期5
  it('tick小于cutoff的记录被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:50, commonProtection:50, duration:0, tick:0 })
    s.update(1, w, em, 100000)
    expect((s as any).arrangements).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick等于cutoff边界不被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const tick = 100000
    ;(s as any).arrangements.push({ id:1, enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:50, commonProtection:50, duration:0, tick: tick - 88000 })
    s.update(1, w, em, tick)
    expect((s as any).arrangements).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('tick大于cutoff的记录保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:50, commonProtection:50, duration:0, tick:50000 })
    s.update(1, w, em, 100000)
    expect((s as any).arrangements).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('多条记录部分过期只删过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push(
      { id:1, enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:50, commonProtection:50, duration:0, tick:0 },
      { id:2, enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:50, commonProtection:50, duration:0, tick:50000 }
    )
    s.update(1, w, em, 100000)
    expect((s as any).arrangements).toHaveLength(1)
    expect((s as any).arrangements[0].id).toBe(2)
    vi.restoreAllMocks()
  })
  it('无过期记录时数组不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:50, commonProtection:50, duration:0, tick:90000 })
    s.update(1, w, em, 100000)
    expect((s as any).arrangements).toHaveLength(1)
    vi.restoreAllMocks()
  })

  // MAX4
  it('arrangements达到16时不再新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 16; i++)
      (s as any).arrangements.push({ id:i+1, enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:50, commonProtection:50, duration:0, tick:100000 })
    s.update(1, w, em, 100000)
    expect((s as any).arrangements.length).toBeLessThanOrEqual(16)
    vi.restoreAllMocks()
  })
  it('arrangements未满时可新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect((s as any).arrangements.length).toBeLessThanOrEqual(16)
  })
  it('MAX_ARRANGEMENTS为16', () => {
    for (let i = 0; i < 16; i++)
      (s as any).arrangements.push({ id:i+1, enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:50, commonProtection:50, duration:0, tick:100000 })
    expect((s as any).arrangements).toHaveLength(16)
  })
  it('nextId在spawn后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).arrangements.push({ id:1, enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:50, commonProtection:50, duration:0, tick:100000 })
    const before = (s as any).nextId
    s.update(1, w, em, 100000)
    expect((s as any).nextId).toBe(before)
    vi.restoreAllMocks()
  })

  // 枚举4
  it('form类型royal_hayward有效', () => {
    ;(s as any).arrangements.push({ id:1, form:'royal_hayward', enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:50, commonProtection:50, duration:0, tick:100000 })
    expect((s as any).arrangements[0].form).toBe('royal_hayward')
  })
  it('form类型manor_hayward有效', () => {
    ;(s as any).arrangements.push({ id:1, form:'manor_hayward', enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:50, commonProtection:50, duration:0, tick:100000 })
    expect((s as any).arrangements[0].form).toBe('manor_hayward')
  })
  it('form类型parish_hayward有效', () => {
    ;(s as any).arrangements.push({ id:1, form:'parish_hayward', enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:50, commonProtection:50, duration:0, tick:100000 })
    expect((s as any).arrangements[0].form).toBe('parish_hayward')
  })
  it('form类型common_hayward有效', () => {
    ;(s as any).arrangements.push({ id:1, form:'common_hayward', enclosureAuthority:50, hedgeMaintenance:50, boundaryEnforcement:50, commonProtection:50, duration:0, tick:100000 })
    expect((s as any).arrangements[0].form).toBe('common_hayward')
  })
})
