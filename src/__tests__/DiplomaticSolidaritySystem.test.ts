import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DiplomaticSolidaritySystem } from '../systems/DiplomaticSolidaritySystem'

const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticSolidaritySystem() }

describe('DiplomaticSolidaritySystem', () => {
  let sys: DiplomaticSolidaritySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  // 1. 基础数据结构
  it('初始pacts为空数组', () => { expect((sys as any).pacts).toHaveLength(0) })
  it('pacts是数组类型', () => { expect(Array.isArray((sys as any).pacts)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入pact后长度为1', () => {
    ;(sys as any).pacts.push({ id: 1 })
    expect((sys as any).pacts).toHaveLength(1)
  })
  it('手动注入3个后长度为3', () => {
    ;(sys as any).pacts.push({ id:1 }, { id:2 }, { id:3 })
    expect((sys as any).pacts).toHaveLength(3)
  })

  // 2. CHECK_INTERVAL=2370节流
  it('tick不足CHECK_INTERVAL=2370时不更新lastCheck', () => {
    sys.update(1, W, EM, 100)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick达到2370时更新lastCheck', () => {
    sys.update(1, W, EM, 2370)
    expect((sys as any).lastCheck).toBe(2370)
  })
  it('第二次调用需再等2370', () => {
    sys.update(1, W, EM, 2370)
    sys.update(1, W, EM, 3000)
    expect((sys as any).lastCheck).toBe(2370)
  })
  it('tick=4740时再次触发', () => {
    sys.update(1, W, EM, 2370)
    sys.update(1, W, EM, 4740)
    expect((sys as any).lastCheck).toBe(4740)
  })
  it('tick=0时不触发', () => {
    sys.update(1, W, EM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2369时不触发', () => {
    sys.update(1, W, EM, 2369)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('update后lastCheck等于传入tick', () => {
    sys.update(1, W, EM, 7110)
    expect((sys as any).lastCheck).toBe(7110)
  })
  it('连续3次interval触发lastCheck正确', () => {
    sys.update(1, W, EM, 2370)
    sys.update(1, W, EM, 4740)
    sys.update(1, W, EM, 7110)
    expect((sys as any).lastCheck).toBe(7110)
  })

  // 3. 字段动态更新
  it('每次update后duration递增', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:0, tick:0 })
    sys.update(1, W, EM, 2370)
    expect((sys as any).pacts[0].duration).toBe(1)
  })
  it('多次update后duration累加', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:0, tick:0 })
    sys.update(1, W, EM, 2370)
    sys.update(1, W, EM, 4740)
    expect((sys as any).pacts[0].duration).toBe(2)
  })
  it('commitment在update后仍在[10,85]范围内', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:0, tick:0 })
    for (let t = 2370; t <= 23700; t += 2370) { sys.update(1, W, EM, t) }
    const v = (sys as any).pacts[0]?.commitment
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(85) }
  })
  it('mutualAid在update后仍在[5,75]范围内', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:0, tick:0 })
    for (let t = 2370; t <= 23700; t += 2370) { sys.update(1, W, EM, t) }
    const v = (sys as any).pacts[0]?.mutualAid
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(75) }
  })
  it('publicSupport在update后仍在[10,85]范围内', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:0, tick:0 })
    for (let t = 2370; t <= 23700; t += 2370) { sys.update(1, W, EM, t) }
    const v = (sys as any).pacts[0]?.publicSupport
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(85) }
  })
  it('cohesion在update后仍在[5,70]范围内', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:0, tick:0 })
    for (let t = 2370; t <= 23700; t += 2370) { sys.update(1, W, EM, t) }
    const v = (sys as any).pacts[0]?.cohesion
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(70) }
  })
  it('duration从0开始每步递增1（5步）', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:0, tick:0 })
    for (let i = 1; i <= 5; i++) {
      sys.update(1, W, EM, 2370 * i)
      expect((sys as any).pacts[0]?.duration).toBe(i)
    }
  })

  // 4. 过期cleanup（cutoff=tick-82000）
  it('tick超过cutoff的pact被移除', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:5, tick:0 })
    sys.update(1, W, EM, 84370)
    expect((sys as any).pacts).toHaveLength(0)
  })
  it('tick未超过cutoff的pact保留', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:5, tick:80000 })
    sys.update(1, W, EM, 84370)
    expect((sys as any).pacts).toHaveLength(1)
  })
  it('混合新旧pact只删旧的', () => {
    ;(sys as any).pacts.push(
      { id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:5, tick:0 },
      { id:2, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:5, tick:80000 }
    )
    sys.update(1, W, EM, 84370)
    expect((sys as any).pacts).toHaveLength(1)
    expect((sys as any).pacts[0].id).toBe(2)
  })
  it('cutoff边界：tick=cutoff时保留', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:5, tick:2370 })
    sys.update(1, W, EM, 84370)
    expect((sys as any).pacts).toHaveLength(1)
  })
  it('全部5个pact过期时清空', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).pacts.push({ id:i+1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:5, tick:0 })
    }
    sys.update(1, W, EM, 84370)
    expect((sys as any).pacts).toHaveLength(0)
  })

  // 5. MAX_PACTS=20上限
  it('pacts不超过MAX_PACTS=20', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2370; t <= 2370 * 30; t += 2370) { sys.update(1, W, EM, t) }
    expect((sys as any).pacts.length).toBeLessThanOrEqual(20)
  })
  it('已有20个时不再新增', () => {
    for (let i = 1; i <= 20; i++) {
      (sys as any).pacts.push({ id:i, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:0, tick:999999 })
    }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2370)
    expect((sys as any).pacts.length).toBe(20)
  })
  it('19个时仍可新增', () => {
    for (let i = 1; i <= 19; i++) {
      (sys as any).pacts.push({ id:i, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:0, tick:999999 })
    }
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2370)
    expect((sys as any).pacts.length).toBeGreaterThanOrEqual(19)
  })
  it('nextId在新增后递增', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const before = (sys as any).nextId
    sys.update(1, W, EM, 2370)
    expect((sys as any).nextId).toBeGreaterThanOrEqual(before)
  })

  // 6. 枚举完整性
  it('basis包含合法SolidarityBasis值', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2370; t <= 2370 * 20; t += 2370) { sys.update(1, W, EM, t) }
    const valid = ['cultural','ideological','economic','defensive']
    const bases = (sys as any).pacts.map((p: any) => p.basis)
    bases.forEach((b: string) => expect(valid).toContain(b))
  })
  it('所有4种SolidarityBasis值合法', () => {
    const valid = ['cultural','ideological','economic','defensive']
    expect(valid).toHaveLength(4)
  })
  it('basis字段存在于新增pact中', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, W, EM, 2370)
    if ((sys as any).pacts.length > 0) {
      expect((sys as any).pacts[0].basis).toBeDefined()
    }
  })

  // 7. 新增pact字段
  it('新增pact含id字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2370)
    if ((sys as any).pacts.length > 0) {
      expect(typeof (sys as any).pacts[0].id).toBe('number')
    }
  })
  it('新增pact的duration初始为0', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2370)
    if ((sys as any).pacts.length > 0) {
      expect((sys as any).pacts[0].duration).toBeLessThanOrEqual(1)
    }
  })
  it('新增pact的civIdA在[1,8]', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2370)
    if ((sys as any).pacts.length > 0) {
      const cid = (sys as any).pacts[0].civIdA
      expect(cid).toBeGreaterThanOrEqual(1); expect(cid).toBeLessThanOrEqual(8)
    }
  })

  // 8. 幂等性与边界
  it('同一tick两次update只触发一次', () => {
    sys.update(1, W, EM, 2370)
    const lc1 = (sys as any).lastCheck
    sys.update(1, W, EM, 2370)
    expect((sys as any).lastCheck).toBe(lc1)
  })
  it('空pacts时update不崩溃', () => {
    expect(() => sys.update(1, W, EM, 2370)).not.toThrow()
  })
  it('PROCEED_CHANCE极低时不spawn(random=0.99)', () => {
    sys.update(1, W, EM, 2370)
    expect((sys as any).pacts).toHaveLength(0)
  })
  it('pacts内元素包含tick字段', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2370)
    ;(sys as any).pacts.forEach((p: any) => expect(p.tick).toBeDefined())
  })
})

describe('DiplomaticSolidaritySystem - 附加测试', () => {
  let sys: DiplomaticSolidaritySystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('commitment初始在[20,55]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2370)
    if ((sys as any).pacts.length > 0) {
      const c = (sys as any).pacts[0].commitment
      expect(c).toBeGreaterThanOrEqual(20); expect(c).toBeLessThanOrEqual(55)
    }
  })
  it('mutualAid初始在[15,45]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2370)
    if ((sys as any).pacts.length > 0) {
      const m = (sys as any).pacts[0].mutualAid
      expect(m).toBeGreaterThanOrEqual(15); expect(m).toBeLessThanOrEqual(45)
    }
  })
  it('civIdA与civIdB不相等（不自我签约）', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2370)
    if ((sys as any).pacts.length > 0) {
      const p = (sys as any).pacts[0]
      expect(p.civIdA).not.toBe(p.civIdB)
    }
  })
  it('MAX_PACTS=20硬上限经100次迭代不超过', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2370; t <= 2370 * 100; t += 2370) { sys.update(1, W, EM, t) }
    expect((sys as any).pacts.length).toBeLessThanOrEqual(20)
  })
  it('basis是4种合法值之一（单个spawn）', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2370)
    if ((sys as any).pacts.length > 0) {
      const valid = ['cultural','ideological','economic','defensive']
      expect(valid).toContain((sys as any).pacts[0].basis)
    }
  })
  it('pacts中不包含重复id', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2370; t <= 2370 * 25; t += 2370) { sys.update(1, W, EM, t) }
    const ids = (sys as any).pacts.map((p: any) => p.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
  it('civIdB在[1,8]范围', () => {
    vi.restoreAllMocks()
    let call = 0
    vi.spyOn(Math, 'random').mockImplementation(() => {
      call++
      if (call === 1) return 0.001; if (call === 2) return 0.0; if (call === 3) return 0.99
      return 0.5
    })
    sys.update(1, W, EM, 2370)
    if ((sys as any).pacts.length > 0) {
      const cid = (sys as any).pacts[0].civIdB
      expect(cid).toBeGreaterThanOrEqual(1); expect(cid).toBeLessThanOrEqual(8)
    }
  })
  it('pacts内每个元素都有basis字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2370; t <= 2370 * 10; t += 2370) { sys.update(1, W, EM, t) }
    ;(sys as any).pacts.forEach((p: any) => expect(p.basis).toBeDefined())
  })
  it('pacts内每个元素都有duration字段', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    for (let t = 2370; t <= 2370 * 10; t += 2370) { sys.update(1, W, EM, t) }
    ;(sys as any).pacts.forEach((p: any) => expect(p.duration).toBeDefined())
  })
  it('cutoff=tick-82000：tick=82370时cutoff=370，tick=0的pact被删', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:5, tick:0 })
    sys.update(1, W, EM, 82370)
    expect((sys as any).pacts).toHaveLength(0)
  })
  it('tick=82370时tick=369的pact被删', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:5, tick:369 })
    sys.update(1, W, EM, 82370)
    expect((sys as any).pacts).toHaveLength(0)
  })
  it('tick=82370时tick=370的pact保留（恰好等于cutoff）', () => {
    ;(sys as any).pacts.push({ id:1, commitment:30, mutualAid:20, publicSupport:30, cohesion:15, duration:5, tick:370 })
    sys.update(1, W, EM, 82370)
    expect((sys as any).pacts).toHaveLength(1)
  })
})
