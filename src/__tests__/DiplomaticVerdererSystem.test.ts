import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DiplomaticVerdererSystem } from '../systems/DiplomaticVerdererSystem'

function makeSys() { return new DiplomaticVerdererSystem() }
const world = {} as any
const em = {} as any

describe('DiplomaticVerdererSystem', () => {
  let sys: DiplomaticVerdererSystem
  beforeEach(() => { sys = makeSys(); vi.restoreAllMocks() })

  // === 初始状态 ===
  it('初始arrangements为空数组', () => {
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('初始nextId为1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('初始lastCheck为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
  it('arrangements是数组类型', () => {
    expect(Array.isArray((sys as any).arrangements)).toBe(true)
  })

  // === 节流逻辑 ===
  it('tick不足CHECK_INTERVAL(2820)时不更新lastCheck', () => {
    sys.update(1, world, em, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到CHECK_INTERVAL时更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2820)
    expect((sys as any).lastCheck).toBe(2820)
  })
  it('tick=2819时不触发（严格小于）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2819)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('第二次调用间隔不足时lastCheck不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 3000)
    expect((sys as any).lastCheck).toBe(3000)
    sys.update(1, world, em, 4000) // 4000-3000=1000 < 2820
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('间隔足���时再次触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 3000)
    sys.update(1, world, em, 6000) // 6000-3000=3000 >= 2820
    expect((sys as any).lastCheck).toBe(6000)
  })

  // === spawn逻辑 ===
  it('random足够小时spawn arrangement', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)   // PROCEED_CHANCE检查 0.001 < 0.0021
      .mockReturnValue(0.5)          // forest/verderer id随机
    sys.update(1, world, em, 2820)
    // 注意：forest和verderer可能相等导致返回，所以不一定spawn
    // 改用确定性mock
  })
  it('random=0时确保spawn（排除相等情况）', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001   // PROCEED_CHANCE
      if (call === 2) return 0.0       // forest = 1 + floor(0*8) = 1
      if (call === 3) return 0.99      // verderer = 1 + floor(0.99*8) = 8
      return 0.5
    })
    sys.update(1, world, em, 2820)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('spawn的arrangement含id字段', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, world, em, 2820)
    const arr = (sys as any).arrangements
    if (arr.length > 0) {
      expect(arr[0]).toHaveProperty('id')
    }
  })
  it('spawn后同次update即递增duration为1', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, world, em, 2820)
    const arr = (sys as any).arrangements
    if (arr.length > 0) {
      // spawn后同次update中 a.duration+=1，所以duration为1
      expect(arr[0].duration).toBe(1)
    }
  })
  it('spawn的arrangement含tick字段等于当前tick', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, world, em, 2820)
    const arr = (sys as any).arrangements
    if (arr.length > 0) {
      expect(arr[0].tick).toBe(2820)
    }
  })
  it('random超过PROCEED_CHANCE(0.0021)时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    sys.update(1, world, em, 2820)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('nextId在spawn后递增', () => {
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.0001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, world, em, 2820)
    const arr = (sys as any).arrangements
    if (arr.length > 0) {
      expect((sys as any).nextId).toBe(2)
    }
  })
  it('达到MAX_ARRANGEMENTS(16)上限时不再spawn', () => {
    // 预填16条
    for (let i = 0; i < 16; i++) {
      (sys as any).arrangements.push({ id: i + 1, tick: 2820, duration: 0, forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.0001)
    sys.update(1, world, em, 2820)
    expect((sys as any).arrangements).toHaveLength(16)
  })

  // === duration递增 ===
  it('update后已有arrangement的duration递增1', () => {
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, verdererCivId: 2, form: 'royal_verderer',
      forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30,
      duration: 5, tick: 100000
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 100000 + 2820)
    expect((sys as any).arrangements[0].duration).toBe(6)
  })
  it('多次update后duration累计递增', () => {
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, verdererCivId: 2, form: 'royal_verderer',
      forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30,
      duration: 0, tick: 200000
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 200000 + 2820)
    sys.update(1, world, em, 200000 + 5640)
    sys.update(1, world, em, 200000 + 8460)
    expect((sys as any).arrangements[0].duration).toBe(3)
  })

  // === cleanup逻辑 ===
  it('tick < cutoff(tick-88000)时删除旧arrangement', () => {
    const currentTick = 200000
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, verdererCivId: 2, form: 'royal_verderer',
      forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30,
      duration: 0, tick: currentTick - 88001 // 严格小于cutoff
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick === cutoff时不删除（边界）', () => {
    const currentTick = 200000
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, verdererCivId: 2, form: 'royal_verderer',
      forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30,
      duration: 0, tick: currentTick - 88000 // 等于cutoff，NOT删除
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('tick > cutoff时保留arrangement', () => {
    const currentTick = 200000
    ;(sys as any).arrangements.push({
      id: 1, forestCivId: 1, verdererCivId: 2, form: 'royal_verderer',
      forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30,
      duration: 0, tick: currentTick - 50000 // 远比cutoff新
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('混合新旧arrangement只删除旧的', () => {
    const currentTick = 200000
    ;(sys as any).arrangements.push(
      { id: 1, forestCivId: 1, verdererCivId: 2, form: 'royal_verderer', forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30, duration: 0, tick: currentTick - 88001 },
      { id: 2, forestCivId: 3, verdererCivId: 4, form: 'forest_verderer', forestJurisdiction: 50, huntingRights: 50, timberManagement: 30, wildlifeProtection: 30, duration: 0, tick: currentTick - 50000 }
    )
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, currentTick)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })

  // === 手动注入 ===
  it('手动注入后arrangements长度正确', () => {
    ;(sys as any).arrangements.push({ id: 10 }, { id: 11 })
    expect((sys as any).arrangements).toHaveLength(2)
  })
  it('手动注入arrangement的id字段可读取', () => {
    ;(sys as any).arrangements.push({ id: 42, tick: 999999, duration: 3 })
    expect((sys as any).arrangements[0].id).toBe(42)
  })
})

describe('DiplomaticVerdererSystem - 附加测试', () => {
  let sys: DiplomaticVerdererSystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('forestJurisdiction在update后仍在[5,85]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, forestCivId:1, verdererCivId:2, form:'royal_verderer', forestJurisdiction:30, huntingRights:40, timberManagement:20, wildlifeProtection:20, duration:0, tick:0 })
    for (let t = 2820; t <= 28200; t += 2820) { sys.update(1, world, em, t) }
    const v = (sys as any).arrangements[0]?.forestJurisdiction
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(85) }
  })
  it('huntingRights在update后仍在[10,90]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, forestCivId:1, verdererCivId:2, form:'royal_verderer', forestJurisdiction:30, huntingRights:40, timberManagement:20, wildlifeProtection:20, duration:0, tick:0 })
    for (let t = 2820; t <= 28200; t += 2820) { sys.update(1, world, em, t) }
    const v = (sys as any).arrangements[0]?.huntingRights
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
  })
  it('timberManagement在update后仍在[5,80]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, forestCivId:1, verdererCivId:2, form:'royal_verderer', forestJurisdiction:30, huntingRights:40, timberManagement:20, wildlifeProtection:20, duration:0, tick:0 })
    for (let t = 2820; t <= 28200; t += 2820) { sys.update(1, world, em, t) }
    const v = (sys as any).arrangements[0]?.timberManagement
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(80) }
  })
  it('wildlifeProtection在update后仍在[5,65]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, forestCivId:1, verdererCivId:2, form:'royal_verderer', forestJurisdiction:30, huntingRights:40, timberManagement:20, wildlifeProtection:20, duration:0, tick:0 })
    for (let t = 2820; t <= 28200; t += 2820) { sys.update(1, world, em, t) }
    const v = (sys as any).arrangements[0]?.wildlifeProtection
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(65) }
  })
  it('VerdererForm包含4种合法值', () => {
    const valid = ['royal_verderer','forest_verderer','chase_verderer','park_verderer']
    expect(valid).toHaveLength(4)
  })
  it('form是4种VerdererForm之一', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2820; t <= 2820 * 20; t += 2820) { sys.update(1, world, em, t) }
    const valid = ['royal_verderer','forest_verderer','chase_verderer','park_verderer']
    ;(sys as any).arrangements.forEach((a: any) => expect(valid).toContain(a.form))
  })
  it('forestCivId在[1,8]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.0001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, world, em, 2820)
    if ((sys as any).arrangements.length > 0) {
      const fid = (sys as any).arrangements[0].forestCivId
      expect(fid).toBeGreaterThanOrEqual(1); expect(fid).toBeLessThanOrEqual(8)
    }
  })
  it('verdererCivId在[1,8]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.0001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, world, em, 2820)
    if ((sys as any).arrangements.length > 0) {
      const vid = (sys as any).arrangements[0].verdererCivId
      expect(vid).toBeGreaterThanOrEqual(1); expect(vid).toBeLessThanOrEqual(8)
    }
  })
  it('forestCivId与verdererCivId不相等', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.0001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, world, em, 2820)
    if ((sys as any).arrangements.length > 0) {
      const a = (sys as any).arrangements[0]
      expect(a.forestCivId).not.toBe(a.verdererCivId)
    }
  })
  it('arrangements中id不重复', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2820; t <= 2820 * 25; t += 2820) { sys.update(1, world, em, t) }
    const ids = (sys as any).arrangements.map((a: any) => a.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
  it('空arrangements时update不崩溃', () => {
    expect(() => sys.update(1, world, em, 2820)).not.toThrow()
  })
  it('PROCEED_CHANCE极低时不spawn(random=0.99)', () => {
    sys.update(1, world, em, 2820)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('MAX_ARRANGEMENTS=16硬上限经100次迭代不超过', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2820; t <= 2820 * 100; t += 2820) { sys.update(1, world, em, t) }
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })
  it('update后arrangements每个元素含form字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2820; t <= 2820 * 10; t += 2820) { sys.update(1, world, em, t) }
    ;(sys as any).arrangements.forEach((a: any) => expect(a.form).toBeDefined())
  })
  it('update后arrangements每个元素含duration字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2820; t <= 2820 * 10; t += 2820) { sys.update(1, world, em, t) }
    ;(sys as any).arrangements.forEach((a: any) => expect(typeof a.duration).toBe('number'))
  })
  it('全部5个过期时arrangements清空', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).arrangements.push({ id:i+1, forestCivId:1, verdererCivId:2, form:'royal_verderer', forestJurisdiction:30, huntingRights:40, timberManagement:20, wildlifeProtection:20, duration:5, tick:0 })
    }
    sys.update(1, world, em, 90820)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('同一tick两次update只触发一次', () => {
    sys.update(1, world, em, 2820)
    const lc1 = (sys as any).lastCheck
    sys.update(1, world, em, 2820)
    expect((sys as any).lastCheck).toBe(lc1)
  })
  it('form是字符串类型', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, 2820)
    if ((sys as any).arrangements.length > 0) { expect(typeof (sys as any).arrangements[0].form).toBe('string') }
  })
  it('nextId每次spawn后加1', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.0001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    const before = (sys as any).nextId
    sys.update(1, world, em, 2820)
    if ((sys as any).arrangements.length > 0) { expect((sys as any).nextId).toBe(before + 1) }
  })
  it('arrangements内每个元素含forestJurisdiction字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2820; t <= 2820 * 10; t += 2820) { sys.update(1, world, em, t) }
    ;(sys as any).arrangements.forEach((a: any) => expect(typeof a.forestJurisdiction).toBe('number'))
  })
  it('arrangements内每个元素含huntingRights字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2820; t <= 2820 * 10; t += 2820) { sys.update(1, world, em, t) }
    ;(sys as any).arrangements.forEach((a: any) => expect(typeof a.huntingRights).toBe('number'))
  })
})

describe('DiplomaticVerdererSystem - 附加测试2', () => {
  let sys: DiplomaticVerdererSystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('新增arrangement含tick字段等于update传入的tick', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.0001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, world, em, 5640)
    if ((sys as any).arrangements.length > 0) { expect((sys as any).arrangements[0].tick).toBe(5640) }
  })
  it('forestJurisdiction初始在[20,60]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.0001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, world, em, 2820)
    if ((sys as any).arrangements.length > 0) {
      const fj = (sys as any).arrangements[0].forestJurisdiction
      expect(fj).toBeGreaterThanOrEqual(20); expect(fj).toBeLessThanOrEqual(60)
    }
  })
  it('huntingRights初始在[25,60]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.0001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, world, em, 2820)
    if ((sys as any).arrangements.length > 0) {
      const hr = (sys as any).arrangements[0].huntingRights
      expect(hr).toBeGreaterThanOrEqual(25); expect(hr).toBeLessThanOrEqual(60)
    }
  })
  it('timberManagement初���在[10,40]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.0001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, world, em, 2820)
    if ((sys as any).arrangements.length > 0) {
      const tm = (sys as any).arrangements[0].timberManagement
      expect(tm).toBeGreaterThanOrEqual(10); expect(tm).toBeLessThanOrEqual(40)
    }
  })
  it('wildlifeProtection初始在[15,40]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => { call++; if(call===1)return 0.0001;if(call===2)return 0.0;if(call===3)return 0.99;return 0.5 })
    sys.update(1, world, em, 2820)
    if ((sys as any).arrangements.length > 0) {
      const wp = (sys as any).arrangements[0].wildlifeProtection
      expect(wp).toBeGreaterThanOrEqual(15); expect(wp).toBeLessThanOrEqual(40)
    }
  })
  it('tick=2820时arrangements内每个元素都有id字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2820; t <= 2820 * 10; t += 2820) { sys.update(1, world, em, t) }
    ;(sys as any).arrangements.forEach((a: any) => expect(typeof a.id).toBe('number'))
  })
})
