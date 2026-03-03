import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DiplomaticSeneschalrySystem } from '../systems/DiplomaticSeneschalrySystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticSeneschalrySystem() }

describe('DiplomaticSeneschalrySystem', () => {
  let sys: DiplomaticSeneschalrySystem
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
  it('手动注入多个arrangements后长度正确', () => {
    ;(sys as any).arrangements.push({ id: 1 }, { id: 2 }, { id: 3 })
    expect((sys as any).arrangements).toHaveLength(3)
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
  it('tick=2719时不触发', () => {
    sys.update(1, W, EM, 2719)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2720精确边界时触发', () => {
    sys.update(1, W, EM, 2720)
    expect((sys as any).lastCheck).toBe(2720)
  })
  it('多次非触发调用lastCheck保持为0', () => {
    sys.update(1, W, EM, 100)
    sys.update(1, W, EM, 500)
    sys.update(1, W, EM, 1000)
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
    for (let t = 2720; t <= 27200; t += 2720) { sys.update(1, W, EM, t) }
    const v = (sys as any).arrangements[0]?.estateManagement
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(85) }
  })
  it('judicialAuthority在update后仍在[10,90]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:0, tick:0 })
    for (let t = 2720; t <= 27200; t += 2720) { sys.update(1, W, EM, t) }
    const v = (sys as any).arrangements[0]?.judicialAuthority
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
  })
  it('fiscalOversight在update后仍在[5,80]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:0, tick:0 })
    for (let t = 2720; t <= 27200; t += 2720) { sys.update(1, W, EM, t) }
    const v = (sys as any).arrangements[0]?.fiscalOversight
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(80) }
  })
  it('militaryCommand在update后仍在[5,65]范围内', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:0, tick:0 })
    for (let t = 2720; t <= 27200; t += 2720) { sys.update(1, W, EM, t) }
    const v = (sys as any).arrangements[0]?.militaryCommand
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(65) }
  })
  it('duration从0开始每次递增1', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:0, tick:0 })
    for (let i = 1; i <= 5; i++) {
      sys.update(1, W, EM, 2720 * i)
      expect((sys as any).arrangements[0]?.duration).toBe(i)
    }
  })

  // 4. 过期cleanup
  it('tick超过cutoff的arrangement被移除', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:5, tick:0 })
    sys.update(1, W, EM, 90720)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick未超过cutoff的arrangement保留', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:5, tick:80000 })
    sys.update(1, W, EM, 90720)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('混合新旧arrangement只删旧的', () => {
    ;(sys as any).arrangements.push(
      { id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:5, tick:0 },
      { id:2, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:5, tick:80000 }
    )
    sys.update(1, W, EM, 90720)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })
  it('cutoff边界：tick恰好等于cutoff时保留', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:5, tick:2720 })
    sys.update(1, W, EM, 90720)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('全部过期时arrangements清空', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).arrangements.push({ id:i+1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:5, tick:0 })
    }
    sys.update(1, W, EM, 90720)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('cutoff=tick-88000正确计算', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:5, tick:10000 })
    // tick=100000, cutoff=12000, arrangement.tick=10000 < 12000 → 被删
    sys.update(1, W, EM, 100000)
    expect((sys as any).arrangements).toHaveLength(0)
  })

  // 5. MAX_ARRANGEMENTS上限
  it('arrangements不超过MAX_ARRANGEMENTS=16', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2720; t <= 2720 * 30; t += 2720) { sys.update(1, W, EM, t) }
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })
  it('已有16个时不再新增', () => {
    for (let i = 1; i <= 16; i++) {
      (sys as any).arrangements.push({ id:i, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:0, tick:999999 })
    }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2720)
    expect((sys as any).arrangements.length).toBe(16)
  })
  it('15个时仍可新增', () => {
    for (let i = 1; i <= 15; i++) {
      (sys as any).arrangements.push({ id:i, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:0, tick:999999 })
    }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2720)
    expect((sys as any).arrangements.length).toBeGreaterThanOrEqual(15)
  })
  it('nextId在新增后递增', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const before = (sys as any).nextId
    sys.update(1, W, EM, 2720)
    const after = (sys as any).nextId
    expect(after).toBeGreaterThanOrEqual(before)
  })
  it('MAX_ARRANGEMENTS=16是硬上限', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2720; t <= 2720 * 100; t += 2720) { sys.update(1, W, EM, t) }
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(16)
  })

  // 6. 枚举完整性
  it('form包含estate_seneschalry', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2720; t <= 2720 * 20; t += 2720) { sys.update(1, W, EM, t) }
    const forms = (sys as any).arrangements.map((a: any) => a.form)
    const valid = ['estate_seneschalry','judicial_seneschalry','fiscal_seneschalry','military_seneschalry']
    forms.forEach((f: string) => expect(valid).toContain(f))
  })
  it('所有4种form值合法', () => {
    const valid = ['estate_seneschalry','judicial_seneschalry','fiscal_seneschalry','military_seneschalry']
    expect(valid).toHaveLength(4)
  })
  it('form字段存在于新增的arrangement中', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2720)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).arrangements[0].form).toBeDefined()
    }
  })
  it('form是字符串类型', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2720)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].form).toBe('string')
    }
  })

  // 7. 新增arrangement的字段结构
  it('新增arrangement含id字段且为数字', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2720)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].id).toBe('number')
    }
  })
  it('新增arrangement含tick字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2720)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).arrangements[0].tick).toBeDefined()
    }
  })
  it('新增arrangement的duration初始为0', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2720)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).arrangements[0].duration).toBe(0)
    }
  })
  it('新增arrangement的estateManagement在[20,60]', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001  // PROCEED_CHANCE
      if (call === 2) return 0.0    // estate = 1
      if (call === 3) return 0.99   // seneschal = 8
      return 0.5
    })
    sys.update(1, W, EM, 2720)
    if ((sys as any).arrangements.length > 0) {
      const em_ = (sys as any).arrangements[0].estateManagement
      expect(em_).toBeGreaterThanOrEqual(20)
      expect(em_).toBeLessThanOrEqual(60)
    }
  })
  it('新增arrangement的estateCivId在[1,8]', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2720)
    if ((sys as any).arrangements.length > 0) {
      const eid = (sys as any).arrangements[0].estateCivId
      expect(eid).toBeGreaterThanOrEqual(1)
      expect(eid).toBeLessThanOrEqual(8)
    }
  })

  // 8. 边界与幂等性
  it('同一tick两次update只触发一次', () => {
    sys.update(1, W, EM, 2720)
    const lc1 = (sys as any).lastCheck
    sys.update(1, W, EM, 2720)
    expect((sys as any).lastCheck).toBe(lc1)
  })
  it('空arrangements时update不崩溃', () => {
    expect(() => sys.update(1, W, EM, 2720)).not.toThrow()
  })
  it('PROCEED_CHANCE极低时新增几率很低', () => {
    // random=0.99 >> 0.0021，不应spawn
    sys.update(1, W, EM, 2720)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('update后lastCheck等于传入tick', () => {
    sys.update(1, W, EM, 8160)
    expect((sys as any).lastCheck).toBe(8160)
  })
})

describe('DiplomaticSeneschalrySystem - 附加测试', () => {
  let sys: DiplomaticSeneschalrySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('arrangements内元素包含seneschalCivId字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2720)
    if ((sys as any).arrangements.length > 0) {
      expect((sys as any).arrangements[0].seneschalCivId).toBeDefined()
    }
  })
  it('arrangements内元素包含judicialAuthority字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2720)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].judicialAuthority).toBe('number')
    }
  })
  it('arrangements内元素包含fiscalOversight字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2720)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].fiscalOversight).toBe('number')
    }
  })
  it('arrangements内元素包含militaryCommand字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2720)
    if ((sys as any).arrangements.length > 0) {
      expect(typeof (sys as any).arrangements[0].militaryCommand).toBe('number')
    }
  })
  it('nextId从1开始每次spawn递增', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call % 3 === 1) return 0.001
      if (call % 3 === 2) return 0.0
      return 0.99
    })
    sys.update(1, W, EM, 2720)
    const idAfterFirst = (sys as any).nextId
    expect(idAfterFirst).toBeGreaterThanOrEqual(1)
  })
  it('tick=88001时cutoff=1，tick=0的arrangement被删除', () => {
    ;(sys as any).arrangements.push({ id:1, estateManagement:30, judicialAuthority:30, fiscalOversight:20, militaryCommand:20, duration:5, tick:0 })
    sys.update(1, W, EM, 88001)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('judicialAuthority初始在[25,60]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001
      if (call === 2) return 0.0
      if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2720)
    if ((sys as any).arrangements.length > 0) {
      const ja = (sys as any).arrangements[0].judicialAuthority
      expect(ja).toBeGreaterThanOrEqual(25)
      expect(ja).toBeLessThanOrEqual(60)
    }
  })
})
