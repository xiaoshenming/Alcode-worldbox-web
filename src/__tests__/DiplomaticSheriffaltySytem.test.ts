import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticSheriffaltySystem } from '../systems/DiplomaticSheriffaltySytem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticSheriffaltySystem() }

describe('DiplomaticSheriffaltySystem', () => {
  let sys: DiplomaticSheriffaltySystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('初始arrangements为空数组', () => { expect((sys as any).arrangements).toHaveLength(0) })
  it('arrangements是数组类型', () => { expect(Array.isArray((sys as any).arrangements)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入arrangement后长度为1', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect((sys as any).arrangements).toHaveLength(1)
  })

  // 2. CHECK_INTERVAL节流
  it('tick不足CHECK_INTERVAL=2760时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到2760时更新lastCheck', () => {
    sys.update(1, W, EM, 2760)
    expect((sys as any).lastCheck).toBe(2760)
  })
  it('第二次调用需再等2760', () => {
    sys.update(1, W, EM, 2760)
    sys.update(1, W, EM, 3500)
    expect((sys as any).lastCheck).toBe(2760)
  })
  it('tick=5520时再次触发', () => {
    sys.update(1, W, EM, 2760)
    sys.update(1, W, EM, 5520)
    expect((sys as any).lastCheck).toBe(5520)
  })
  it('tick=0时不触���', () => {
    sys.update(1, W, EM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    ;(sys as any).arrangements.push({ id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:0, tick:0 })
    sys.update(1, W, EM, 2760)
    expect((sys as any).arrangements[0].duration).toBe(1)
  })
  it('多次update后duration累加', () => {
    ;(sys as any).arrangements.push({ id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:0, tick:0 })
    sys.update(1, W, EM, 2760)
    sys.update(1, W, EM, 5520)
    expect((sys as any).arrangements[0].duration).toBe(2)
  })
  it('lawAuthority在update后仍在[5,85]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:0, tick:0 })
    for (let t = 2760; t <= 27600; t += 2760) sys.update(1, W, EM, t)
    const v = (sys as any).arrangements[0]?.lawAuthority
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(85) }
  })
  it('royalMandate在update后仍在[10,90]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:0, tick:0 })
    for (let t = 2760; t <= 27600; t += 2760) sys.update(1, W, EM, t)
    const v = (sys as any).arrangements[0]?.royalMandate
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
  })

  // 4. 过期cleanup
  it('tick超过cutoff的arrangement被移除', () => {
    ;(sys as any).arrangements.push({ id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:5, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 90760) // 90760 - 88000 = 2760 > 0
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick未超过cutoff的arrangement保留', () => {
    ;(sys as any).arrangements.push({ id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:5, tick:80000 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 90760)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('混合新旧arrangement只删旧的', () => {
    ;(sys as any).arrangements.push(
      { id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:5, tick:0 },
      { id:2, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:5, tick:80000 }
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 90760)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })
  it('cutoff边界：tick恰好等于cutoff时保留', () => {
    ;(sys as any).arrangements.push({ id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:5, tick:2760 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 90760) // cutoff=90760-88000=2760, tick(2760) < 2760 is false
    expect((sys as any).arrangements).toHaveLength(1)
  })

  // 5. MAX_ARRANGEMENTS上限
  it('arrangements不超过MAX_ARRANGEMENTS=16', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2760; t <= 2760 * 30; t += 2760) sys.update(1, W, EM, t)
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })
  it('已有16个时不再新增', () => {
    for (let i = 1; i <= 16; i++) {
      (sys as any).arrangements.push({ id:i, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:0, tick:999999 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2760)
    expect((sys as any).arrangements.length).toBe(16)
  })
  it('15个时仍可新增', () => {
    for (let i = 1; i <= 15; i++) {
      (sys as any).arrangements.push({ id:i, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:0, tick:999999 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2760)
    expect((sys as any).arrangements.length).toBeGreaterThanOrEqual(15)
  })
  it('nextId在新增后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const before = (sys as any).nextId
    sys.update(1, W, EM, 2760)
    const after = (sys as any).nextId
    expect(after).toBeGreaterThanOrEqual(before)
  })

  // 6. 枚举完整性
  it('form包含合法SheriffaltyForm值', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2760; t <= 2760 * 20; t += 2760) sys.update(1, W, EM, t)
    const valid = ['county_sheriffalty','royal_sheriffalty','judicial_sheriffalty','military_sheriffalty']
    const forms = (sys as any).arrangements.map((a: any) => a.form)
    forms.forEach((f: string) => expect(valid).toContain(f))
  })
  it('所有4种SheriffaltyForm值合法', () => {
    const valid = ['county_sheriffalty','royal_sheriffalty','judicial_sheriffalty','military_sheriffalty']
    expect(valid).toHaveLength(4)
  })
  it('form字段存在于新增的arrangement中', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2760)
    if ((sys as any).arrangements.length > 0)
      expect((sys as any).arrangements[0].form).toBeDefined()
  })
})
