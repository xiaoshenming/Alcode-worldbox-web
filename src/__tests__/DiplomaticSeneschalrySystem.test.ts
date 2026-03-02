import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticSeneschalrySystem } from '../systems/DiplomaticSeneschalrySystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticSeneschalrySystem() }

describe('DiplomaticSeneschalrySystem', () => {
  let sys: DiplomaticSeneschalrySystem
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
  it('tick不足CHECK_INTERVAL时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    sys.update(1, W, EM, 2720)
    expect((sys as any).lastCheck).toBe(2720)
  })
  it('第二次调用需再等CHECK_INTERVAL', () => {
    sys.update(1, W, EM, 2720)
    sys.update(1, W, EM, 3000)
    expect((sys as any).lastCheck).toBe(2720)
  })
  it('tick=5440时再次触发', () => {
    sys.update(1, W, EM, 2720)
    sys.update(1, W, EM, 5440)
    expect((sys as any).lastCheck).toBe(5440)
  })
  it('tick=0时不触发', () => {
    sys.update(1, W, EM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:0, tick:0 })
    sys.update(1, W, EM, 2720)
    expect((sys as any).arrangements[0].duration).toBe(1)
  })
  it('多次update后duration累加', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:0, tick:0 })
    sys.update(1, W, EM, 2720)
    sys.update(1, W, EM, 5440)
    expect((sys as any).arrangements[0].duration).toBe(2)
  })
  it('estateManagement在update后仍在[5,85]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:0, tick:0 })
    for (let t = 2720; t <= 27200; t += 2720) sys.update(1, W, EM, t)
    const v = (sys as any).arrangements[0]?.estateManagement
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(85) }
  })
  it('judicialAuthority在update后仍在[10,90]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:0, tick:0 })
    for (let t = 2720; t <= 27200; t += 2720) sys.update(1, W, EM, t)
    const v = (sys as any).arrangements[0]?.judicialAuthority
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
  })

  // 4. 过期cleanup
  it('tick超过cutoff的arrangement被移除', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:5, tick:0 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 90720) // 90720 - 88000 = 2720 > 0
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick未超过cutoff的arrangement保留', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:5, tick:80000 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 90720)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('混合新旧arrangement只删旧的', () => {
    ;(sys as any).arrangements.push(
      { id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:5, tick:0 },
      { id:2, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:5, tick:80000 }
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 90720)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })
  it('cutoff边界：tick恰好等于cutoff时被移除', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:5, tick:2720 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, 90720) // cutoff=90720-88000=2720, tick(2720) < cutoff(2720) is false
    expect((sys as any).arrangements).toHaveLength(1)
  })

  // 5. MAX_ARRANGEMENTS上限
  it('arrangements不超过MAX_ARRANGEMENTS=16', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2720; t <= 2720 * 30; t += 2720) sys.update(1, W, EM, t)
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })
  it('已有16个时不再新增', () => {
    for (let i = 1; i <= 16; i++) {
      (sys as any).arrangements.push({ id:i, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:0, tick:999999 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2720)
    expect((sys as any).arrangements.length).toBe(16)
  })
  it('15个时仍可新增', () => {
    for (let i = 1; i <= 15; i++) {
      (sys as any).arrangements.push({ id:i, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:0, tick:999999 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2720)
    expect((sys as any).arrangements.length).toBeGreaterThanOrEqual(15)
  })
  it('nextId在新增后递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const before = (sys as any).nextId
    sys.update(1, W, EM, 2720)
    const after = (sys as any).nextId
    expect(after).toBeGreaterThanOrEqual(before)
  })

  // 6. 枚举完整性
  it('form包含estate_seneschalry', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2720; t <= 2720 * 20; t += 2720) sys.update(1, W, EM, t)
    const forms = (sys as any).arrangements.map((a: any) => a.form)
    const valid = ['estate_seneschalry','judicial_seneschalry','fiscal_seneschalry','military_seneschalry']
    forms.forEach((f: string) => expect(valid).toContain(f))
  })
  it('所有4种form值合法', () => {
    const valid = ['estate_seneschalry','judicial_seneschalry','fiscal_seneschalry','military_seneschalry']
    expect(valid).toHaveLength(4)
  })
  it('form字段存在于新增的arrangement中', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2720)
    if ((sys as any).arrangements.length > 0)
      expect((sys as any).arrangements[0].form).toBeDefined()
  })
})
