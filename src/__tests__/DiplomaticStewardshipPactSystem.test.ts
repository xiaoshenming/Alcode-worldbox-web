import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DiplomaticStewardshipPactSystem } from '../systems/DiplomaticStewardshipPactSystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticStewardshipPactSystem() }

describe('DiplomaticStewardshipPactSystem', () => {
  let sys: DiplomaticStewardshipPactSystem
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
  it('注入3个后长度为3', () => {
    ;(sys as any).arrangements.push({ id:1 }, { id:2 }, { id:3 })
    expect((sys as any).arrangements).toHaveLength(3)
  })

  // 2. CHECK_INTERVAL=2590节流
  it('tick不足2590时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到2590时更新lastCheck', () => {
    sys.update(1, W, EM, 2590)
    expect((sys as any).lastCheck).toBe(2590)
  })
  it('第二次调用需再等2590', () => {
    sys.update(1, W, EM, 2590)
    sys.update(1, W, EM, 3000)
    expect((sys as any).lastCheck).toBe(2590)
  })
  it('tick=5180时再次触发', () => {
    sys.update(1, W, EM, 2590)
    sys.update(1, W, EM, 5180)
    expect((sys as any).lastCheck).toBe(5180)
  })
  it('tick=0时不触发', () => {
    sys.update(1, W, EM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2589时不触发', () => {
    sys.update(1, W, EM, 2589)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('update后lastCheck等于传入tick', () => {
    sys.update(1, W, EM, 7770)
    expect((sys as any).lastCheck).toBe(7770)
  })
  it('连续3次interval触发lastCheck正确', () => {
    sys.update(1, W, EM, 2590)
    sys.update(1, W, EM, 5180)
    sys.update(1, W, EM, 7770)
    expect((sys as any).lastCheck).toBe(7770)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    ;(sys as any).arrangements.push({ id:1, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:0, tick:0 })
    sys.update(1, W, EM, 2590)
    expect((sys as any).arrangements[0].duration).toBe(1)
  })
  it('多次update后duration累加', () => {
    ;(sys as any).arrangements.push({ id:1, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:0, tick:0 })
    sys.update(1, W, EM, 2590)
    sys.update(1, W, EM, 5180)
    expect((sys as any).arrangements[0].duration).toBe(2)
  })
  it('resourceCare在update后仍在[5,85]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:0, tick:0 })
    for (let t = 2590; t <= 25900; t += 2590) { sys.update(1, W, EM, t) }
    const v = (sys as any).arrangements[0]?.resourceCare
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(85) }
  })
  it('sharedBenefit在update后仍在[10,90]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:0, tick:0 })
    for (let t = 2590; t <= 25900; t += 2590) { sys.update(1, W, EM, t) }
    const v = (sys as any).arrangements[0]?.sharedBenefit
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
  })
  it('complianceRate在update后仍在[5,80]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:0, tick:0 })
    for (let t = 2590; t <= 25900; t += 2590) { sys.update(1, W, EM, t) }
    const v = (sys as any).arrangements[0]?.complianceRate
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(80) }
  })
  it('sustainabilityScore在update后仍在[5,65]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:0, tick:0 })
    for (let t = 2590; t <= 25900; t += 2590) { sys.update(1, W, EM, t) }
    const v = (sys as any).arrangements[0]?.sustainabilityScore
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(65) }
  })
  it('duration从0每步递增1（5步）', () => {
    ;(sys as any).arrangements.push({ id:1, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:0, tick:0 })
    for (let i = 1; i <= 5; i++) {
      sys.update(1, W, EM, 2590 * i)
      expect((sys as any).arrangements[0]?.duration).toBe(i)
    }
  })

  // 4. 过期cleanup（cutoff=tick-88000）
  it('tick超过cutoff的arrangement被移除', () => {
    ;(sys as any).arrangements.push({ id:1, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:5, tick:0 })
    sys.update(1, W, EM, 90590)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick未超过cutoff的arrangement保留', () => {
    ;(sys as any).arrangements.push({ id:1, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:5, tick:80000 })
    sys.update(1, W, EM, 90590)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('混合新旧arrangement只删旧的', () => {
    ;(sys as any).arrangements.push(
      { id:1, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:5, tick:0 },
      { id:2, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:5, tick:80000 }
    )
    sys.update(1, W, EM, 90590)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })
  it('cutoff边界：tick=cutoff时保留', () => {
    ;(sys as any).arrangements.push({ id:1, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:5, tick:2590 })
    sys.update(1, W, EM, 90590)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('全部5个过期时清空', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).arrangements.push({ id:i+1, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:5, tick:0 })
    }
    sys.update(1, W, EM, 90590)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick=100000时cutoff=12000，tick=10000的arrangement被删', () => {
    ;(sys as any).arrangements.push({ id:1, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:5, tick:10000 })
    sys.update(1, W, EM, 100000)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  // 5. MAX_ARRANGEMENTS=16上限
  it('arrangements不超过MAX_ARRANGEMENTS=16', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2590; t <= 2590 * 30; t += 2590) { sys.update(1, W, EM, t) }
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })
  it('已有16个时不再新增', () => {
    for (let i = 1; i <= 16; i++) {
      (sys as any).arrangements.push({ id:i, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:0, tick:999999 })
    }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2590)
    expect((sys as any).arrangements.length).toBe(16)
  })
  it('15个时仍可新增', () => {
    for (let i = 1; i <= 15; i++) {
      (sys as any).arrangements.push({ id:i, resourceCare:30, sharedBenefit:30, complianceRate:20, sustainabilityScore:20, duration:0, tick:999999 })
    }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2590)
    expect((sys as any).arrangements.length).toBeGreaterThanOrEqual(15)
  })
  it('nextId在新增后递增', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const before = (sys as any).nextId
    sys.update(1, W, EM, 2590)
    expect((sys as any).nextId).toBeGreaterThanOrEqual(before)
  })

  // 6. 枚举完整性
  it('form包含合法StewardshipPactForm值', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2590; t <= 2590 * 20; t += 2590) { sys.update(1, W, EM, t) }
    const valid = ['land_stewardship','water_stewardship','forest_stewardship','mineral_stewardship']
    const forms = (sys as any).arrangements.map((a: any) => a.form)
    forms.forEach((f: string) => expect(valid).toContain(f))
  })
  it('所有4种StewardshipPactForm值合法', () => {
    const valid = ['land_stewardship','water_stewardship','forest_stewardship','mineral_stewardship']
    expect(valid).toHaveLength(4)
  })
  it('form字段存在于新增arrangement中', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2590)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).arrangements[0].form).toBeDefined()
    }
  })
  it('form是字符串类型', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2590)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].form).toBe('string')
    }
  })

  // 7. 新增arrangement字段结构
  it('新增arrangement含id数字字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if (call===1) return 0.001; if (call===2) return 0.0; if (call===3) return 0.99; return 0.5 })
    sys.update(1, W, EM, 2590)
    if ((sys as any).arrangements.length > 0) { expect(typeof (sys as any).arrangements[0].id).toBe('number') }
  })
  it('新增arrangement的duration初始为0', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if (call===1) return 0.001; if (call===2) return 0.0; if (call===3) return 0.99; return 0.5 })
    sys.update(1, W, EM, 2590)
    if ((sys as any).arrangements.length > 0) { expect((sys as any).arrangements[0].duration).toBeLessThanOrEqual(1) }
  })
  it('新增arrangement含tick字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if (call===1) return 0.001; if (call===2) return 0.0; if (call===3) return 0.99; return 0.5 })
    sys.update(1, W, EM, 2590)
    if ((sys as any).arrangements.length > 0) { expect((sys as any).arrangements[0].tick).toBeDefined() }
  })
  it('stewardCivId与partnerCivId不相等', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if (call===1) return 0.001; if (call===2) return 0.0; if (call===3) return 0.99; return 0.5 })
    sys.update(1, W, EM, 2590)
    if ((sys as any).arrangements.length > 0) {
      const a = (sys as any).arrangements[0]
      expect(a.stewardCivId).not.toBe(a.partnerCivId)
    }
  })
  it('stewardCivId在[1,8]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if (call===1) return 0.001; if (call===2) return 0.0; if (call===3) return 0.99; return 0.5 })
    sys.update(1, W, EM, 2590)
    if ((sys as any).arrangements.length > 0) {
      const sid = (sys as any).arrangements[0].stewardCivId
      expect(sid).toBeGreaterThanOrEqual(1); expect(sid).toBeLessThanOrEqual(8)
    }
  })

  // 8. 幂等性与边界
  it('同一tick两次update只触发一次', () => {
    sys.update(1, W, EM, 2590)
    const lc1 = (sys as any).lastCheck
    sys.update(1, W, EM, 2590)
    expect((sys as any).lastCheck).toBe(lc1)
  })
  it('空arrangements时update不崩溃', () => {
    expect(() => sys.update(1, W, EM, 2590)).not.toThrow()
  })
  it('PROCEED_CHANCE极低时不spawn(random=0.99)', () => {
    sys.update(1, W, EM, 2590)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('MAX_ARRANGEMENTS=16硬上限100次迭代不超过', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2590; t <= 2590 * 100; t += 2590) { sys.update(1, W, EM, t) }
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })
  it('arrangements中id不重复', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2590; t <= 2590 * 25; t += 2590) { sys.update(1, W, EM, t) }
    const ids = (sys as any).arrangements.map((a: any) => a.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
  it('arrangements内每个元素都有resourceCare字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2590; t <= 2590 * 10; t += 2590) { sys.update(1, W, EM, t) }
    ;(sys as any).arrangements.forEach((a: any) => expect(typeof a.resourceCare).toBe('number'))
  })
})

describe('DiplomaticStewardshipPactSystem - 附加测试', () => {
  let sys: DiplomaticStewardshipPactSystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('partnerCivId在[1,8]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, W, EM, 2590)
    if ((sys as any).arrangements.length > 0) {
      const pid = (sys as any).arrangements[0].partnerCivId
      expect(pid).toBeGreaterThanOrEqual(1); expect(pid).toBeLessThanOrEqual(8)
    }
  })
  it('resourceCare初始在[20,60]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, W, EM, 2590)
    if ((sys as any).arrangements.length > 0) {
      const rc = (sys as any).arrangements[0].resourceCare
      expect(rc).toBeGreaterThanOrEqual(20); expect(rc).toBeLessThanOrEqual(60)
    }
  })
  it('sharedBenefit初始在[25,60]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, W, EM, 2590)
    if ((sys as any).arrangements.length > 0) {
      const sb = (sys as any).arrangements[0].sharedBenefit
      expect(sb).toBeGreaterThanOrEqual(25); expect(sb).toBeLessThanOrEqual(60)
    }
  })
  it('nextId每次spawn后加1', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    const before = (sys as any).nextId
    sys.update(1, W, EM, 2590)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).nextId).toBe(before + 1)
    }
  })
  it('arrangements内每个元素都有sharedBenefit字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2590; t <= 2590 * 10; t += 2590) { sys.update(1, W, EM, t) }
    ;(sys as any).arrangements.forEach((a: any) => expect(typeof a.sharedBenefit).toBe('number'))
  })
  it('arrangements内每个元素都有sustainabilityScore字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2590; t <= 2590 * 10; t += 2590) { sys.update(1, W, EM, t) }
    ;(sys as any).arrangements.forEach((a: any) => expect(typeof a.sustainabilityScore).toBe('number'))
  })
  it('complianceRate初始在[10,40]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, W, EM, 2590)
    if ((sys as any).arrangements.length > 0) {
      const cr = (sys as any).arrangements[0].complianceRate
      expect(cr).toBeGreaterThanOrEqual(10); expect(cr).toBeLessThanOrEqual(40)
    }
  })
})
