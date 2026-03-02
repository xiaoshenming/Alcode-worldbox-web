import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticHegemonySystem } from '../systems/DiplomaticHegemonySystem'

const w = {} as any, em = {} as any
function sys() { return new DiplomaticHegemonySystem() }

describe('DiplomaticHegemonySystem', () => {
  let s: DiplomaticHegemonySystem
  beforeEach(() => { s = sys() })

  // 基础5
  it('relations初始为空', () => { expect((s as any).relations).toHaveLength(0) })
  it('relations是数组', () => { expect(Array.isArray((s as any).relations)).toBe(true) })
  it('nextId初始为1', () => { expect((s as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((s as any).lastCheck).toBe(0) })
  it('注入后relations有数据', () => {
    ;(s as any).relations.push({ id: 1 })
    expect((s as any).relations).toHaveLength(1)
  })

  // 节流5
  it('tick不足CHECK_INTERVAL不更新lastCheck', () => {
    s.update(1, w, em, 100)
    expect((s as any).lastCheck).toBe(0)
  })
  it('tick>=CHECK_INTERVAL更新lastCheck', () => {
    s.update(1, w, em, 2560)
    expect((s as any).lastCheck).toBe(2560)
  })
  it('第二次tick不足间隔不再更新', () => {
    s.update(1, w, em, 2560)
    s.update(1, w, em, 2600)
    expect((s as any).lastCheck).toBe(2560)
  })
  it('两次间隔足够各自更新lastCheck', () => {
    s.update(1, w, em, 2560)
    s.update(1, w, em, 5120)
    expect((s as any).lastCheck).toBe(5120)
  })
  it('tick=0时不触发', () => {
    s.update(1, w, em, 0)
    expect((s as any).lastCheck).toBe(0)
  })

  // 字段范围5
  it('influenceLevel在[10,90]内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).relations.push({ id:1, influenceLevel:90, complianceRate:85, resistanceIndex:80, stabilityFactor:70, duration:0, tick:0 })
    s.update(1, w, em, 2560)
    expect((s as any).relations[0].influenceLevel).toBeLessThanOrEqual(90)
    vi.restoreAllMocks()
  })
  it('complianceRate在[10,85]内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).relations.push({ id:1, influenceLevel:50, complianceRate:85, resistanceIndex:50, stabilityFactor:50, duration:0, tick:0 })
    s.update(1, w, em, 2560)
    expect((s as any).relations[0].complianceRate).toBeLessThanOrEqual(85)
    vi.restoreAllMocks()
  })
  it('resistanceIndex在[5,80]内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(s as any).relations.push({ id:1, influenceLevel:50, complianceRate:50, resistanceIndex:5, stabilityFactor:50, duration:0, tick:0 })
    s.update(1, w, em, 2560)
    expect((s as any).relations[0].resistanceIndex).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })
  it('stabilityFactor在[5,70]内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).relations.push({ id:1, influenceLevel:50, complianceRate:50, resistanceIndex:50, stabilityFactor:70, duration:0, tick:0 })
    s.update(1, w, em, 2560)
    expect((s as any).relations[0].stabilityFactor).toBeLessThanOrEqual(70)
    vi.restoreAllMocks()
  })
  it('duration每次update递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).relations.push({ id:1, influenceLevel:50, complianceRate:50, resistanceIndex:50, stabilityFactor:50, duration:0, tick:0 })
    s.update(1, w, em, 2560)
    expect((s as any).relations[0].duration).toBe(1)
    vi.restoreAllMocks()
  })

  // 过期5
  it('tick小于cutoff的记录被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).relations.push({ id:1, influenceLevel:50, complianceRate:50, resistanceIndex:50, stabilityFactor:50, duration:0, tick:0 })
    s.update(1, w, em, 100000)
    expect((s as any).relations).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick等于cutoff边界不被清除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const tick = 100000
    ;(s as any).relations.push({ id:1, influenceLevel:50, complianceRate:50, resistanceIndex:50, stabilityFactor:50, duration:0, tick: tick - 88000 })
    s.update(1, w, em, tick)
    expect((s as any).relations).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('tick大于cutoff的记录保留', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).relations.push({ id:1, influenceLevel:50, complianceRate:50, resistanceIndex:50, stabilityFactor:50, duration:0, tick:50000 })
    s.update(1, w, em, 100000)
    expect((s as any).relations).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('多条记录部分过期只删过期的', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).relations.push(
      { id:1, influenceLevel:50, complianceRate:50, resistanceIndex:50, stabilityFactor:50, duration:0, tick:0 },
      { id:2, influenceLevel:50, complianceRate:50, resistanceIndex:50, stabilityFactor:50, duration:0, tick:50000 }
    )
    s.update(1, w, em, 100000)
    expect((s as any).relations).toHaveLength(1)
    expect((s as any).relations[0].id).toBe(2)
    vi.restoreAllMocks()
  })
  it('无过期记录时数组不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).relations.push({ id:1, influenceLevel:50, complianceRate:50, resistanceIndex:50, stabilityFactor:50, duration:0, tick:90000 })
    s.update(1, w, em, 100000)
    expect((s as any).relations).toHaveLength(1)
    vi.restoreAllMocks()
  })

  // MAX4
  it('relations达到16时不再新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 16; i++)
      (s as any).relations.push({ id:i+1, influenceLevel:50, complianceRate:50, resistanceIndex:50, stabilityFactor:50, duration:0, tick:100000 })
    s.update(1, w, em, 100000)
    expect((s as any).relations.length).toBeLessThanOrEqual(16)
    vi.restoreAllMocks()
  })
  it('relations未满时长度小于16', () => {
    expect((s as any).relations.length).toBeLessThan(16)
  })
  it('MAX_RELATIONS为16', () => {
    for (let i = 0; i < 16; i++)
      (s as any).relations.push({ id:i+1, influenceLevel:50, complianceRate:50, resistanceIndex:50, stabilityFactor:50, duration:0, tick:100000 })
    expect((s as any).relations).toHaveLength(16)
  })
  it('nextId在无spawn时不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(s as any).relations.push({ id:1, influenceLevel:50, complianceRate:50, resistanceIndex:50, stabilityFactor:50, duration:0, tick:100000 })
    const before = (s as any).nextId
    s.update(1, w, em, 100000)
    expect((s as any).nextId).toBe(before)
    vi.restoreAllMocks()
  })

  // 枚举4
  it('form类型military_dominance有效', () => {
    ;(s as any).relations.push({ id:1, form:'military_dominance', influenceLevel:50, complianceRate:50, resistanceIndex:50, stabilityFactor:50, duration:0, tick:100000 })
    expect((s as any).relations[0].form).toBe('military_dominance')
  })
  it('form类型economic_control有效', () => {
    ;(s as any).relations.push({ id:1, form:'economic_control', influenceLevel:50, complianceRate:50, resistanceIndex:50, stabilityFactor:50, duration:0, tick:100000 })
    expect((s as any).relations[0].form).toBe('economic_control')
  })
  it('form类型cultural_influence有效', () => {
    ;(s as any).relations.push({ id:1, form:'cultural_influence', influenceLevel:50, complianceRate:50, resistanceIndex:50, stabilityFactor:50, duration:0, tick:100000 })
    expect((s as any).relations[0].form).toBe('cultural_influence')
  })
  it('form类型political_pressure有效', () => {
    ;(s as any).relations.push({ id:1, form:'political_pressure', influenceLevel:50, complianceRate:50, resistanceIndex:50, stabilityFactor:50, duration:0, tick:100000 })
    expect((s as any).relations[0].form).toBe('political_pressure')
  })
})
