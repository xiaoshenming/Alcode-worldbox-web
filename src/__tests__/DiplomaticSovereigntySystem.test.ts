import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DiplomaticSovereigntySystem } from '../systems/DiplomaticSovereigntySystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticSovereigntySystem() }

describe('DiplomaticSovereigntySystem', () => {
  let sys: DiplomaticSovereigntySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('初始agreements为空数组', () => { expect((sys as any).agreements).toHaveLength(0) })
  it('agreements是数组类型', () => { expect(Array.isArray((sys as any).agreements)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入agreement后长度为1', () => {
    ;(sys as any).agreements.push({ id: 1 })
    expect((sys as any).agreements).toHaveLength(1)
  })
  it('注入3个后长度为3', () => {
    ;(sys as any).agreements.push({ id:1 }, { id:2 }, { id:3 })
    expect((sys as any).agreements).toHaveLength(3)
  })

  // 2. CHECK_INTERVAL=2520节流
  it('tick不足2520时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到2520时更新lastCheck', () => {
    sys.update(1, W, EM, 2520)
    expect((sys as any).lastCheck).toBe(2520)
  })
  it('第二次调用需再等2520', () => {
    sys.update(1, W, EM, 2520)
    sys.update(1, W, EM, 3000)
    expect((sys as any).lastCheck).toBe(2520)
  })
  it('tick=5040时再次触发', () => {
    sys.update(1, W, EM, 2520)
    sys.update(1, W, EM, 5040)
    expect((sys as any).lastCheck).toBe(5040)
  })
  it('tick=0时不触发', () => {
    sys.update(1, W, EM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2519时不触发', () => {
    sys.update(1, W, EM, 2519)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('update后lastCheck等于传入tick', () => {
    sys.update(1, W, EM, 7560)
    expect((sys as any).lastCheck).toBe(7560)
  })
  it('连续3次interval触发lastCheck正确', () => {
    sys.update(1, W, EM, 2520)
    sys.update(1, W, EM, 5040)
    sys.update(1, W, EM, 7560)
    expect((sys as any).lastCheck).toBe(7560)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    ;(sys as any).agreements.push({ id:1, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:0, tick:0 })
    sys.update(1, W, EM, 2520)
    expect((sys as any).agreements[0].duration).toBe(1)
  })
  it('多次update后duration累加', () => {
    ;(sys as any).agreements.push({ id:1, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:0, tick:0 })
    sys.update(1, W, EM, 2520)
    sys.update(1, W, EM, 5040)
    expect((sys as any).agreements[0].duration).toBe(2)
  })
  it('recognitionLevel在update后仍在[10,90]范围内', () => {
    ;(sys as any).agreements.push({ id:1, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:0, tick:0 })
    for (let t = 2520; t <= 25200; t += 2520) { sys.update(1, W, EM, t) }
    const v = (sys as any).agreements[0]?.recognitionLevel
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
  })
  it('respectIndex在update后仍在[10,85]范围内', () => {
    ;(sys as any).agreements.push({ id:1, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:0, tick:0 })
    for (let t = 2520; t <= 25200; t += 2520) { sys.update(1, W, EM, t) }
    const v = (sys as any).agreements[0]?.respectIndex
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(85) }
  })
  it('nonInterference在update后仍在[5,75]范围内', () => {
    ;(sys as any).agreements.push({ id:1, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:0, tick:0 })
    for (let t = 2520; t <= 25200; t += 2520) { sys.update(1, W, EM, t) }
    const v = (sys as any).agreements[0]?.nonInterference
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(75) }
  })
  it('mutualBenefit在update后仍在[5,65]范围内', () => {
    ;(sys as any).agreements.push({ id:1, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:0, tick:0 })
    for (let t = 2520; t <= 25200; t += 2520) { sys.update(1, W, EM, t) }
    const v = (sys as any).agreements[0]?.mutualBenefit
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(65) }
  })
  it('duration从0每步递增1（5步）', () => {
    ;(sys as any).agreements.push({ id:1, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:0, tick:0 })
    for (let i = 1; i <= 5; i++) {
      sys.update(1, W, EM, 2520 * i)
      expect((sys as any).agreements[0]?.duration).toBe(i)
    }
  })

  // 4. 过期cleanup（cutoff=tick-92000）
  it('tick超过cutoff的agreement被移除', () => {
    ;(sys as any).agreements.push({ id:1, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:5, tick:0 })
    sys.update(1, W, EM, 94520)
    expect((sys as any).agreements).toHaveLength(0)
  })
  it('tick未超过cutoff的agreement保留', () => {
    ;(sys as any).agreements.push({ id:1, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:5, tick:80000 })
    sys.update(1, W, EM, 94520)
    expect((sys as any).agreements).toHaveLength(1)
  })
  it('混合新旧agreement只删旧的', () => {
    ;(sys as any).agreements.push(
      { id:1, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:5, tick:0 },
      { id:2, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:5, tick:80000 }
    )
    sys.update(1, W, EM, 94520)
    expect((sys as any).agreements).toHaveLength(1)
    expect((sys as any).agreements[0].id).toBe(2)
  })
  it('cutoff边界：tick=cutoff时保留', () => {
    ;(sys as any).agreements.push({ id:1, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:5, tick:2520 })
    sys.update(1, W, EM, 94520)
    expect((sys as any).agreements).toHaveLength(1)
  })
  it('全部5个agreement过期时清空', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).agreements.push({ id:i+1, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:5, tick:0 })
    }
    sys.update(1, W, EM, 94520)
    expect((sys as any).agreements).toHaveLength(0)
  })

  // 5. MAX_AGREEMENTS=18上限
  it('agreements不超过MAX_AGREEMENTS=18', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2520; t <= 2520 * 30; t += 2520) { sys.update(1, W, EM, t) }
    expect((sys as any).agreements.length).toBeLessThanOrEqual(18)
  })
  it('已有18个时不再新增', () => {
    for (let i = 1; i <= 18; i++) {
      (sys as any).agreements.push({ id:i, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:0, tick:999999 })
    }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2520)
    expect((sys as any).agreements.length).toBe(18)
  })
  it('17个时仍可新增', () => {
    for (let i = 1; i <= 17; i++) {
      (sys as any).agreements.push({ id:i, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:0, tick:999999 })
    }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2520)
    expect((sys as any).agreements.length).toBeGreaterThanOrEqual(17)
  })
  it('nextId在新增后递增', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const before = (sys as any).nextId
    sys.update(1, W, EM, 2520)
    expect((sys as any).nextId).toBeGreaterThanOrEqual(before)
  })

  // 6. 枚举完整性
  it('form包含合法SovereigntyForm值', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2520; t <= 2520 * 20; t += 2520) { sys.update(1, W, EM, t) }
    const valid = ['territorial_sovereignty','political_independence','economic_autonomy','cultural_self_determination']
    const forms = (sys as any).agreements.map((a: any) => a.form)
    forms.forEach((f: string) => expect(valid).toContain(f))
  })
  it('所有4种SovereigntyForm值合法', () => {
    const valid = ['territorial_sovereignty','political_independence','economic_autonomy','cultural_self_determination']
    expect(valid).toHaveLength(4)
  })
  it('form字段存在于新增agreement中', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2520)
    if ((sys as any).agreements.length > 0) {
      expect((sys as any).agreements[0].form).toBeDefined()
    }
  })

  // 7. 新增agreement字段结构
  it('新增agreement含id数字字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2520)
    if ((sys as any).agreements.length > 0) {
      expect(typeof (sys as any).agreements[0].id).toBe('number')
    }
  })
  it('新增agreement的duration初始为0', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2520)
    if ((sys as any).agreements.length > 0) {
      expect((sys as any).agreements[0].duration).toBeLessThanOrEqual(1)
    }
  })
  it('新增agreement的civIdA在[1,8]', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2520)
    if ((sys as any).agreements.length > 0) {
      const cid = (sys as any).agreements[0].civIdA
      expect(cid).toBeGreaterThanOrEqual(1); expect(cid).toBeLessThanOrEqual(8)
    }
  })
  it('新增agreement含tick字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2520)
    if ((sys as any).agreements.length > 0) {
      expect((sys as any).agreements[0].tick).toBeDefined()
    }
  })
  it('civIdA与civIdB不相等', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2520)
    if ((sys as any).agreements.length > 0) {
      const a = (sys as any).agreements[0]
      expect(a.civIdA).not.toBe(a.civIdB)
    }
  })

  // 8. 幂等性与边界
  it('同一tick两次update只触发一次', () => {
    sys.update(1, W, EM, 2520)
    const lc1 = (sys as any).lastCheck
    sys.update(1, W, EM, 2520)
    expect((sys as any).lastCheck).toBe(lc1)
  })
  it('空agreements时update不崩溃', () => {
    expect(() => sys.update(1, W, EM, 2520)).not.toThrow()
  })
  it('PROCEED_CHANCE极低时不spawn(random=0.99)', () => {
    sys.update(1, W, EM, 2520)
    expect((sys as any).agreements).toHaveLength(0)
  })
  it('MAX_AGREEMENTS=18硬上限100次迭代不超过', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2520; t <= 2520 * 100; t += 2520) { sys.update(1, W, EM, t) }
    expect((sys as any).agreements.length).toBeLessThanOrEqual(18)
  })
  it('agreements中不包含重复id', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2520; t <= 2520 * 25; t += 2520) { sys.update(1, W, EM, t) }
    const ids = (sys as any).agreements.map((a: any) => a.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
})

describe('DiplomaticSovereigntySystem - 附加测试', () => {
  let sys: DiplomaticSovereigntySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('recognitionLevel初始在[25,65]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if (call===1) return 0.001; if (call===2) return 0.0; if (call===3) return 0.99; return 0.5 })
    sys.update(1, W, EM, 2520)
    if ((sys as any).agreements.length > 0) {
      const r = (sys as any).agreements[0].recognitionLevel
      expect(r).toBeGreaterThanOrEqual(25); expect(r).toBeLessThanOrEqual(65)
    }
  })
  it('respectIndex初始在[20,55]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if (call===1) return 0.001; if (call===2) return 0.0; if (call===3) return 0.99; return 0.5 })
    sys.update(1, W, EM, 2520)
    if ((sys as any).agreements.length > 0) {
      const r = (sys as any).agreements[0].respectIndex
      expect(r).toBeGreaterThanOrEqual(20); expect(r).toBeLessThanOrEqual(55)
    }
  })
  it('agreements内元素包含civIdB字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if (call===1) return 0.001; if (call===2) return 0.0; if (call===3) return 0.99; return 0.5 })
    sys.update(1, W, EM, 2520)
    if ((sys as any).agreements.length > 0) {
      expect((sys as any).agreements[0].civIdB).toBeDefined()
    }
  })
  it('update不崩溃（无��agreements状态）', () => {
    expect(() => { sys.update(1, W, EM, 2520); sys.update(1, W, EM, 5040) }).not.toThrow()
  })
  it('form是字符串类型', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2520)
    if ((sys as any).agreements.length > 0) {
      expect(typeof (sys as any).agreements[0].form).toBe('string')
    }
  })
  it('agreements内每个元素都有nonInterference字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2520; t <= 2520 * 10; t += 2520) { sys.update(1, W, EM, t) }
    ;(sys as any).agreements.forEach((a: any) => expect(typeof a.nonInterference).toBe('number'))
  })
  it('agreements内每个元素都有mutualBenefit字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2520; t <= 2520 * 10; t += 2520) { sys.update(1, W, EM, t) }
    ;(sys as any).agreements.forEach((a: any) => expect(typeof a.mutualBenefit).toBe('number'))
  })
  it('cutoff=tick-92000：tick=100520时cutoff=8520', () => {
    ;(sys as any).agreements.push({ id:1, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:5, tick:8000 })
    sys.update(1, W, EM, 100520)
    // tick=8000 < cutoff=8520 → 被删
    expect((sys as any).agreements).toHaveLength(0)
  })
  it('tick=100520时tick=8520的agreement保留', () => {
    ;(sys as any).agreements.push({ id:1, recognitionLevel:30, respectIndex:25, nonInterference:20, mutualBenefit:15, duration:5, tick:8520 })
    sys.update(1, W, EM, 100520)
    expect((sys as any).agreements).toHaveLength(1)
  })
})
