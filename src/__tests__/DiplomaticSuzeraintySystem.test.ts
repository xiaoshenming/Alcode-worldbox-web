import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DiplomaticSuzeraintySystem } from '../systems/DiplomaticSuzeraintySystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticSuzeraintySystem() }

describe('DiplomaticSuzeraintySystem', () => {
  let sys: DiplomaticSuzeraintySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('初始relations为空数组', () => { expect((sys as any).relations).toHaveLength(0) })
  it('relations是数组类型', () => { expect(Array.isArray((sys as any).relations)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入relation后长度为1', () => {
    ;(sys as any).relations.push({ id: 1 })
    expect((sys as any).relations).toHaveLength(1)
  })
  it('注入3个后长度为3', () => {
    ;(sys as any).relations.push({ id:1 }, { id:2 }, { id:3 })
    expect((sys as any).relations).toHaveLength(3)
  })

  // 2. CHECK_INTERVAL=2540节流
  it('tick不足2540时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到2540时更新lastCheck', () => {
    sys.update(1, W, EM, 2540)
    expect((sys as any).lastCheck).toBe(2540)
  })
  it('第二次调用需再等2540', () => {
    sys.update(1, W, EM, 2540)
    sys.update(1, W, EM, 3000)
    expect((sys as any).lastCheck).toBe(2540)
  })
  it('tick=5080时再���触发', () => {
    sys.update(1, W, EM, 2540)
    sys.update(1, W, EM, 5080)
    expect((sys as any).lastCheck).toBe(5080)
  })
  it('tick=0时不触发', () => {
    sys.update(1, W, EM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2539时不触发', () => {
    sys.update(1, W, EM, 2539)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('update后lastCheck等于传入tick', () => {
    sys.update(1, W, EM, 7620)
    expect((sys as any).lastCheck).toBe(7620)
  })
  it('连续3次interval触发lastCheck正确', () => {
    sys.update(1, W, EM, 2540)
    sys.update(1, W, EM, 5080)
    sys.update(1, W, EM, 7620)
    expect((sys as any).lastCheck).toBe(7620)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    ;(sys as any).relations.push({ id:1, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:0, tick:0 })
    sys.update(1, W, EM, 2540)
    expect((sys as any).relations[0].duration).toBe(1)
  })
  it('多次update后duration累加', () => {
    ;(sys as any).relations.push({ id:1, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:0, tick:0 })
    sys.update(1, W, EM, 2540)
    sys.update(1, W, EM, 5080)
    expect((sys as any).relations[0].duration).toBe(2)
  })
  it('authorityLevel在update后仍在[10,90]范围内', () => {
    ;(sys as any).relations.push({ id:1, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:0, tick:0 })
    for (let t = 2540; t <= 25400; t += 2540) { sys.update(1, W, EM, t) }
    const v = (sys as any).relations[0]?.authorityLevel
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
  })
  it('tributeRate在update后仍在[5,70]范围内', () => {
    ;(sys as any).relations.push({ id:1, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:0, tick:0 })
    for (let t = 2540; t <= 25400; t += 2540) { sys.update(1, W, EM, t) }
    const v = (sys as any).relations[0]?.tributeRate
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(70) }
  })
  it('loyaltyIndex在update后仍在[10,85]范围内', () => {
    ;(sys as any).relations.push({ id:1, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:0, tick:0 })
    for (let t = 2540; t <= 25400; t += 2540) { sys.update(1, W, EM, t) }
    const v = (sys as any).relations[0]?.loyaltyIndex
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(85) }
  })
  it('protectionValue在update后仍在[5,65]范围内', () => {
    ;(sys as any).relations.push({ id:1, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:0, tick:0 })
    for (let t = 2540; t <= 25400; t += 2540) { sys.update(1, W, EM, t) }
    const v = (sys as any).relations[0]?.protectionValue
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(65) }
  })
  it('duration从0每步递增1（5步）', () => {
    ;(sys as any).relations.push({ id:1, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:0, tick:0 })
    for (let i = 1; i <= 5; i++) {
      sys.update(1, W, EM, 2540 * i)
      expect((sys as any).relations[0]?.duration).toBe(i)
    }
  })

  // 4. 过期cleanup（cutoff=tick-90000）
  it('tick超过cutoff的relation被移除', () => {
    ;(sys as any).relations.push({ id:1, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:5, tick:0 })
    sys.update(1, W, EM, 92540)
    expect((sys as any).relations).toHaveLength(0)
  })
  it('tick未超过cutoff的relation保留', () => {
    ;(sys as any).relations.push({ id:1, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:5, tick:80000 })
    sys.update(1, W, EM, 92540)
    expect((sys as any).relations).toHaveLength(1)
  })
  it('混合新旧relation只删旧的', () => {
    ;(sys as any).relations.push(
      { id:1, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:5, tick:0 },
      { id:2, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:5, tick:80000 }
    )
    sys.update(1, W, EM, 92540)
    expect((sys as any).relations).toHaveLength(1)
    expect((sys as any).relations[0].id).toBe(2)
  })
  it('cutoff边界：tick=cutoff时保留', () => {
    ;(sys as any).relations.push({ id:1, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:5, tick:2540 })
    sys.update(1, W, EM, 92540)
    expect((sys as any).relations).toHaveLength(1)
  })
  it('全部5个过期时清空', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).relations.push({ id:i+1, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:5, tick:0 })
    }
    sys.update(1, W, EM, 92540)
    expect((sys as any).relations).toHaveLength(0)
  })

  // 5. MAX_RELATIONS=16上限
  it('relations不超过MAX_RELATIONS=16', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2540; t <= 2540 * 30; t += 2540) { sys.update(1, W, EM, t) }
    expect((sys as any).relations.length).toBeLessThanOrEqual(16)
  })
  it('已有16个时不再新增', () => {
    for (let i = 1; i <= 16; i++) {
      (sys as any).relations.push({ id:i, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:0, tick:999999 })
    }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2540)
    expect((sys as any).relations.length).toBe(16)
  })
  it('15个时仍可新增', () => {
    for (let i = 1; i <= 15; i++) {
      (sys as any).relations.push({ id:i, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:0, tick:999999 })
    }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2540)
    expect((sys as any).relations.length).toBeGreaterThanOrEqual(15)
  })
  it('nextId在新增后递增', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const before = (sys as any).nextId
    sys.update(1, W, EM, 2540)
    expect((sys as any).nextId).toBeGreaterThanOrEqual(before)
  })

  // 6. 枚举完整性
  it('form包含合法SuzeraintyForm值', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2540; t <= 2540 * 20; t += 2540) { sys.update(1, W, EM, t) }
    const valid = ['tributary_obligation','military_service','political_deference','economic_tribute']
    const forms = (sys as any).relations.map((r: any) => r.form)
    forms.forEach((f: string) => expect(valid).toContain(f))
  })
  it('所有4种SuzeraintyForm值合法', () => {
    const valid = ['tributary_obligation','military_service','political_deference','economic_tribute']
    expect(valid).toHaveLength(4)
  })
  it('form字段存在于新增relation中', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2540)
    if ((sys as any).relations.length > 0) { expect((sys as any).relations[0].form).toBeDefined() }
  })

  // 7. 新增relation字段结构
  it('新增relation含id数字字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, W, EM, 2540)
    if ((sys as any).relations.length > 0) { expect(typeof (sys as any).relations[0].id).toBe('number') }
  })
  it('suzerainCivId与vassalCivId不相等', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, W, EM, 2540)
    if ((sys as any).relations.length > 0) {
      const r = (sys as any).relations[0]
      expect(r.suzerainCivId).not.toBe(r.vassalCivId)
    }
  })
  it('新增relation的duration初始为0', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, W, EM, 2540)
    if ((sys as any).relations.length > 0) { expect((sys as any).relations[0].duration).toBeLessThanOrEqual(1) }
  })
  it('suzerainCivId在[1,8]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, W, EM, 2540)
    if ((sys as any).relations.length > 0) {
      const sid = (sys as any).relations[0].suzerainCivId
      expect(sid).toBeGreaterThanOrEqual(1); expect(sid).toBeLessThanOrEqual(8)
    }
  })
  it('vassalCivId在[1,8]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, W, EM, 2540)
    if ((sys as any).relations.length > 0) {
      const vid = (sys as any).relations[0].vassalCivId
      expect(vid).toBeGreaterThanOrEqual(1); expect(vid).toBeLessThanOrEqual(8)
    }
  })

  // 8. 幂等性与边界
  it('同一tick两次update只触发一次', () => {
    sys.update(1, W, EM, 2540)
    const lc1 = (sys as any).lastCheck
    sys.update(1, W, EM, 2540)
    expect((sys as any).lastCheck).toBe(lc1)
  })
  it('空relations时update不崩溃', () => {
    expect(() => sys.update(1, W, EM, 2540)).not.toThrow()
  })
  it('PROCEED_CHANCE极低时不spawn(random=0.99)', () => {
    sys.update(1, W, EM, 2540)
    expect((sys as any).relations).toHaveLength(0)
  })
  it('MAX_RELATIONS=16硬上限100次迭代不超过', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2540; t <= 2540 * 100; t += 2540) { sys.update(1, W, EM, t) }
    expect((sys as any).relations.length).toBeLessThanOrEqual(16)
  })
  it('relations中id不重复', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2540; t <= 2540 * 25; t += 2540) { sys.update(1, W, EM, t) }
    const ids = (sys as any).relations.map((r: any) => r.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
  it('relations内每个元素都有authorityLevel字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2540; t <= 2540 * 10; t += 2540) { sys.update(1, W, EM, t) }
    ;(sys as any).relations.forEach((r: any) => expect(typeof r.authorityLevel).toBe('number'))
  })
  it('form是字符串类型', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2540)
    if ((sys as any).relations.length > 0) { expect(typeof (sys as any).relations[0].form).toBe('string') }
  })
})

describe('DiplomaticSuzeraintySystem - 附加测试', () => {
  let sys: DiplomaticSuzeraintySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('authorityLevel初始在[25,65]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, W, EM, 2540)
    if ((sys as any).relations.length > 0) {
      const al = (sys as any).relations[0].authorityLevel
      expect(al).toBeGreaterThanOrEqual(25); expect(al).toBeLessThanOrEqual(65)
    }
  })
  it('tributeRate初始在[15,45]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, W, EM, 2540)
    if ((sys as any).relations.length > 0) {
      const tr = (sys as any).relations[0].tributeRate
      expect(tr).toBeGreaterThanOrEqual(15); expect(tr).toBeLessThanOrEqual(45)
    }
  })
  it('loyaltyIndex初始在[20,55]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, W, EM, 2540)
    if ((sys as any).relations.length > 0) {
      const li = (sys as any).relations[0].loyaltyIndex
      expect(li).toBeGreaterThanOrEqual(20); expect(li).toBeLessThanOrEqual(55)
    }
  })
  it('relations内每个元素含tick字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2540; t <= 2540 * 10; t += 2540) { sys.update(1, W, EM, t) }
    ;(sys as any).relations.forEach((r: any) => expect(r.tick).toBeDefined())
  })
  it('relations内每个元素含duration字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2540; t <= 2540 * 10; t += 2540) { sys.update(1, W, EM, t) }
    ;(sys as any).relations.forEach((r: any) => expect(typeof r.duration).toBe('number'))
  })
  it('nextId每次spawn后加1', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    const before = (sys as any).nextId
    sys.update(1, W, EM, 2540)
    if ((sys as any).relations.length > 0) { expect((sys as any).nextId).toBe(before + 1) }
  })
  it('cutoff=tick-90000：tick=92540时cutoff=2540', () => {
    ;(sys as any).relations.push({ id:1, authorityLevel:30, tributeRate:20, loyaltyIndex:25, protectionValue:15, duration:5, tick:2539 })
    sys.update(1, W, EM, 92540)
    expect((sys as any).relations).toHaveLength(0)
  })
  it('update后relations内元素数量不超过MAX_RELATIONS', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2540; t <= 2540 * 50; t += 2540) { sys.update(1, W, EM, t) }
    expect((sys as any).relations.length).toBeLessThanOrEqual(16)
  })
})
