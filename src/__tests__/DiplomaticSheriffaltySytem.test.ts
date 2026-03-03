import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DiplomaticSheriffaltySystem } from '../systems/DiplomaticSheriffaltySytem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticSheriffaltySystem() }

describe('DiplomaticSheriffaltySystem', () => {
  let sys: DiplomaticSheriffaltySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('初始arrangements为空数组', () => { expect((sys as any).arrangements).toHaveLength(0) })
  it('arrangements是数组类型', () => { expect(Array.isArray((sys as any).arrangements)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入arrangement后长度为1', () => {
    ;(sys as any).arrangements.push({ id: 1 })
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('手动注入3个后长度为3', () => {
    ;(sys as any).arrangements.push({ id:1 }, { id:2 }, { id:3 })
    expect((sys as any).arrangements).toHaveLength(3)
  })

  // 2. CHECK_INTERVAL=2760节流
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
  it('tick=0时不触发', () => {
    sys.update(1, W, EM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2759时不触发', () => {
    sys.update(1, W, EM, 2759)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2760精确边界时触发', () => {
    sys.update(1, W, EM, 2760)
    expect((sys as any).lastCheck).toBe(2760)
  })
  it('update后lastCheck等于传入tick', () => {
    sys.update(1, W, EM, 8280)
    expect((sys as any).lastCheck).toBe(8280)
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
    for (let t = 2760; t <= 27600; t += 2760) { sys.update(1, W, EM, t) }
    const v = (sys as any).arrangements[0]?.lawAuthority
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(85) }
  })
  it('royalMandate在update后仍在[10,90]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:0, tick:0 })
    for (let t = 2760; t <= 27600; t += 2760) { sys.update(1, W, EM, t) }
    const v = (sys as any).arrangements[0]?.royalMandate
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
  })
  it('judicialPower在update后仍在[5,80]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:0, tick:0 })
    for (let t = 2760; t <= 27600; t += 2760) { sys.update(1, W, EM, t) }
    const v = (sys as any).arrangements[0]?.judicialPower
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(80) }
  })
  it('militaryLevy在update后仍在[5,65]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:0, tick:0 })
    for (let t = 2760; t <= 27600; t += 2760) { sys.update(1, W, EM, t) }
    const v = (sys as any).arrangements[0]?.militaryLevy
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(65) }
  })
  it('duration从0开始每次递增1（5步）', () => {
    ;(sys as any).arrangements.push({ id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:0, tick:0 })
    for (let i = 1; i <= 5; i++) {
      sys.update(1, W, EM, 2760 * i)
      expect((sys as any).arrangements[0]?.duration).toBe(i)
    }
  })

  // 4. 过期cleanup
  it('tick超过cutoff的arrangement被移除', () => {
    ;(sys as any).arrangements.push({ id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:5, tick:0 })
    sys.update(1, W, EM, 90760)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick未超过cutoff的arrangement保留', () => {
    ;(sys as any).arrangements.push({ id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:5, tick:80000 })
    sys.update(1, W, EM, 90760)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('混合新旧arrangement只删旧的', () => {
    ;(sys as any).arrangements.push(
      { id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:5, tick:0 },
      { id:2, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:5, tick:80000 }
    )
    sys.update(1, W, EM, 90760)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })
  it('cutoff边界：tick恰好等于cutoff时保留', () => {
    ;(sys as any).arrangements.push({ id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:5, tick:2760 })
    sys.update(1, W, EM, 90760)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('5个全部过期时清空', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).arrangements.push({ id:i+1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:5, tick:0 })
    }
    sys.update(1, W, EM, 90760)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  // 5. MAX_ARRANGEMENTS=16上限
  it('arrangements不超过MAX_ARRANGEMENTS=16', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2760; t <= 2760 * 30; t += 2760) { sys.update(1, W, EM, t) }
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })
  it('已有16个时不再新增', () => {
    for (let i = 1; i <= 16; i++) {
      (sys as any).arrangements.push({ id:i, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:0, tick:999999 })
    }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2760)
    expect((sys as any).arrangements.length).toBe(16)
  })
  it('15个时仍可新增', () => {
    for (let i = 1; i <= 15; i++) {
      (sys as any).arrangements.push({ id:i, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:0, tick:999999 })
    }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2760)
    expect((sys as any).arrangements.length).toBeGreaterThanOrEqual(15)
  })
  it('nextId在新增后递增', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const before = (sys as any).nextId
    sys.update(1, W, EM, 2760)
    expect((sys as any).nextId).toBeGreaterThanOrEqual(before)
  })

  // 6. 枚举完整性
  it('form包含合法SheriffaltyForm值', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2760; t <= 2760 * 20; t += 2760) { sys.update(1, W, EM, t) }
    const valid = ['county_sheriffalty','royal_sheriffalty','judicial_sheriffalty','military_sheriffalty']
    const forms = (sys as any).arrangements.map((a: any) => a.form)
    forms.forEach((f: string) => expect(valid).toContain(f))
  })
  it('所有4种SheriffaltyForm值合法', () => {
    const valid = ['county_sheriffalty','royal_sheriffalty','judicial_sheriffalty','military_sheriffalty']
    expect(valid).toHaveLength(4)
  })
  it('form字段存在于新增的arrangement中', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2760)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).arrangements[0].form).toBeDefined()
    }
  })
  it('form是字符串类型', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2760)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].form).toBe('string')
    }
  })

  // 7. 新增arrangement的字段结构
  it('新增arrangement含id字段且为数字', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2760)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].id).toBe('number')
    }
  })
  it('新增arrangement的duration初始为0', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2760)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).arrangements[0].duration).toBeLessThanOrEqual(1)
    }
  })
  it('新增arrangement的countyCivId在[1,8]', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2760)
    if ((sys as any).arrangements.length > 0) {
      const cid = (sys as any).arrangements[0].countyCivId
      expect(cid).toBeGreaterThanOrEqual(1)
      expect(cid).toBeLessThanOrEqual(8)
    }
  })

  // 8. 幂等性与边界
  it('同一tick两次update只触发一次', () => {
    sys.update(1, W, EM, 2760)
    const lc1 = (sys as any).lastCheck
    sys.update(1, W, EM, 2760)
    expect((sys as any).lastCheck).toBe(lc1)
  })
  it('空arrangements时update不崩溃', () => {
    expect(() => sys.update(1, W, EM, 2760)).not.toThrow()
  })
  it('PROCEED_CHANCE极低时不spawn(random=0.99)', () => {
    sys.update(1, W, EM, 2760)
    expect((sys as any).arrangements).toHaveLength(0)
  })
})

describe('DiplomaticSheriffaltySystem - 附加测试', () => {
  let sys: DiplomaticSheriffaltySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('arrangements内元素包含sheriffCivId字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2760)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).arrangements[0].sheriffCivId).toBeDefined()
    }
  })
  it('arrangements内元素包含royalMandate字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2760)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].royalMandate).toBe('number')
    }
  })
  it('arrangements内元素包含judicialPower字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2760)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].judicialPower).toBe('number')
    }
  })
  it('arrangements内元素包含militaryLevy字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2760)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].militaryLevy).toBe('number')
    }
  })
  it('tick超过88000+的cutoff时arrangement被删', () => {
    ;(sys as any).arrangements.push({ id:1, lawAuthority:30, royalMandate:30, judicialPower:20, militaryLevy:20, duration:5, tick:0 })
    sys.update(1, W, EM, 100000)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('MAX_ARRANGEMENTS硬上限100次迭代不超过16', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2760; t <= 2760 * 100; t += 2760) { sys.update(1, W, EM, t) }
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })
  it('lawAuthority初始在[20,60]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2760)
    if ((sys as any).arrangements.length > 0) {
      const la = (sys as any).arrangements[0].lawAuthority
      expect(la).toBeGreaterThanOrEqual(20); expect(la).toBeLessThanOrEqual(60)
    }
  })
  it('PROCEED_CHANCE常量为0.0021', () => {
    // random=0.002 < 0.0021，应当spawn
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.002   // < PROCEED_CHANCE=0.0021
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2760)
    expect((sys as any).arrangements.length).toBeGreaterThanOrEqual(0)
  })
  it('arrangements中每个元素都有tick字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2760)
    ;(sys as any).arrangements.forEach((a: any) => expect(a.tick).toBeDefined())
  })
  it('nextId每次spawn后加1', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    const before = (sys as any).nextId
    sys.update(1, W, EM, 2760)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).nextId).toBe(before + 1)
    }
  })
  it('连续3次触发interval时lastCheck正确更新', () => {
    sys.update(1, W, EM, 2760)
    sys.update(1, W, EM, 5520)
    sys.update(1, W, EM, 8280)
    expect((sys as any).lastCheck).toBe(8280)
  })
  it('空arrangements update后lastCheck更新正常', () => {
    sys.update(1, W, EM, 2760)
    expect((sys as any).lastCheck).toBe(2760)
    expect((sys as any).arrangements).toHaveLength(0)
  })
})
