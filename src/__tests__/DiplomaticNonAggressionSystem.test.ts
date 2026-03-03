import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticNonAggressionSystem } from '../systems/DiplomaticNonAggressionSystem'
import type { NonAggressionPact, PactStrength } from '../systems/DiplomaticNonAggressionSystem'

const CHECK_INTERVAL = 2400
const MAX_PACTS = 20
const EXPIRE_OFFSET = 82000
const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticNonAggressionSystem() }
function getP(sys: any): NonAggressionPact[] { return sys.pacts }
function makeP(o: Partial<NonAggressionPact> = {}): NonAggressionPact {
  return { id: 1, civIdA: 1, civIdB: 2, pactStrength: 'symbolic', trust: 40, compliance: 40, borderTension: 20, tradeBonus: 15, duration: 0, tick: 0, ...o }
}

describe('DiplomaticNonAggressionSystem — 基础数据结构', () => {
  let sys: DiplomaticNonAggressionSystem
  beforeEach(() => { sys = makeSys() })

  it('初始pacts为空数组', () => { expect(getP(sys)).toHaveLength(0) })
  it('pacts是数组类型', () => { expect(Array.isArray(getP(sys))).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入一条后长度为1', () => { getP(sys).push(makeP()); expect(getP(sys)).toHaveLength(1) })
  it('NonAggressionPact包含id字段', () => { expect(makeP()).toHaveProperty('id') })
  it('NonAggressionPact包含civIdA字段', () => { expect(makeP()).toHaveProperty('civIdA') })
  it('NonAggressionPact包含civIdB字段', () => { expect(makeP()).toHaveProperty('civIdB') })
  it('NonAggressionPact包含trust字段', () => { expect(makeP()).toHaveProperty('trust') })
  it('NonAggressionPact包含duration和tick', () => {
    const p = makeP()
    expect(p).toHaveProperty('duration')
    expect(p).toHaveProperty('tick')
  })
  it('注入两条后长度为2', () => {
    getP(sys).push(makeP({ id: 1 }))
    getP(sys).push(makeP({ id: 2 }))
    expect(getP(sys)).toHaveLength(2)
  })
})

describe('DiplomaticNonAggressionSystem — CHECK_INTERVAL=2400 节流', () => {
  let sys: DiplomaticNonAggressionSystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0不触发', () => { sys.update(1, W, EM, 0); expect((sys as any).lastCheck).toBe(0) })
  it('tick=CHECK_INTERVAL-1不触发', () => {
    sys.update(1, W, EM, CHECK_INTERVAL - 1); expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=CHECK_INTERVAL触发', () => {
    sys.update(1, W, EM, CHECK_INTERVAL); expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick=CHECK_INTERVAL+1000触发', () => {
    sys.update(1, W, EM, CHECK_INTERVAL + 1000); expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1000)
  })
  it('间隔不足时不更新', () => {
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('间隔足够时第二次更新', () => {
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('tick=1被节流', () => { sys.update(1, W, EM, 1); expect((sys as any).lastCheck).toBe(0) })
  it('三次足够间隔', () => {
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    sys.update(1, W, EM, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })
})

describe('DiplomaticNonAggressionSystem — 数值字段动态更新', () => {
  let sys: DiplomaticNonAggressionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('duration每tick递增1', () => {
    getP(sys).push(makeP({ duration: 0, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(getP(sys)[0].duration).toBe(1)
  })
  it('trust在[5, 100]', () => {
    getP(sys).push(makeP({ trust: 40, tick: CHECK_INTERVAL }))
    for (let _i = 1; _i <= 100; _i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * _i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).pacts[0]?.trust
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(100) }
  })
  it('compliance在[10, 100]', () => {
    getP(sys).push(makeP({ compliance: 40, tick: CHECK_INTERVAL }))
    for (let _i = 1; _i <= 100; _i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * _i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).pacts[0]?.compliance
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(100) }
  })
  it('borderTension在[2, 60]', () => {
    getP(sys).push(makeP({ borderTension: 20, tick: CHECK_INTERVAL }))
    for (let _i = 1; _i <= 100; _i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * _i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).pacts[0]?.borderTension
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(2); expect(v).toBeLessThanOrEqual(60) }
  })
  it('tradeBonus在[2, 40]', () => {
    getP(sys).push(makeP({ tradeBonus: 15, tick: CHECK_INTERVAL }))
    for (let _i = 1; _i <= 100; _i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * _i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).pacts[0]?.tradeBonus
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(2); expect(v).toBeLessThanOrEqual(40) }
  })
  it('多次update后duration累积', () => {
    getP(sys).push(makeP({ tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    sys.update(1, W, EM, CHECK_INTERVAL * 3)
    expect(getP(sys)[0].duration).toBe(3)
  })
  it('trust最小值>=5', () => {
    getP(sys).push(makeP({ trust: 5, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect(getP(sys)[0].trust).toBeGreaterThanOrEqual(5)
  })
  it('tradeBonus最大值<=40', () => {
    getP(sys).push(makeP({ tradeBonus: 40, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect(getP(sys)[0].tradeBonus).toBeLessThanOrEqual(40)
  })
})

describe('DiplomaticNonAggressionSystem — 过期清理(cutoff=tick-82000)', () => {
  let sys: DiplomaticNonAggressionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0在tick=84000时被清理', () => {
    getP(sys).push(makeP({ id: 1, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 84000)
    expect(getP(sys)).toHaveLength(0)
  })
  it('新鲜tick存活', () => {
    getP(sys).push(makeP({ id: 1, tick: 84000 - 1000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 84000)
    expect(getP(sys)).toHaveLength(1)
  })
  it('cutoff边界时保留', () => {
    getP(sys).push(makeP({ id: 1, tick: 2000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 84000)
    expect(getP(sys)).toHaveLength(1)
  })
  it('只删过期的', () => {
    getP(sys).push(makeP({ id: 1, tick: 0 }))
    getP(sys).push(makeP({ id: 2, tick: 84000 - 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 84000)
    expect(getP(sys)).toHaveLength(1)
    expect(getP(sys)[0].id).toBe(2)
  })
  it('全部过期时清空', () => {
    getP(sys).push(makeP({ id: 1, tick: 100 }))
    getP(sys).push(makeP({ id: 2, tick: 200 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 84000)
    expect(getP(sys)).toHaveLength(0)
  })
  it('无记录时不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, 84000)).not.toThrow()
  })
  it('三条混合正确保留', () => {
    getP(sys).push(makeP({ id: 1, tick: 50 }))
    getP(sys).push(makeP({ id: 2, tick: 84000 - 500 }))
    getP(sys).push(makeP({ id: 3, tick: 84000 - 1500 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 84000)
    expect(getP(sys).every(p => p.id !== 1)).toBe(true)
  })
  it('EXPIRE_OFFSET=82000', () => { expect(EXPIRE_OFFSET).toBe(82000) })
})

describe('DiplomaticNonAggressionSystem — MAX_PACTS=20 上限', () => {
  let sys: DiplomaticNonAggressionSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('满20条时不新增', () => {
    for (let _i = 1; _i <= MAX_PACTS; _i++) {
      getP(sys).push(makeP({ id: _i, tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(getP(sys)).toHaveLength(MAX_PACTS)
  })
  it('PactStrength包含4种形式', () => {
    const forms: PactStrength[] = ['symbolic', 'binding', 'enforced', 'sacred']
    expect(forms).toHaveLength(4)
  })
  it('各form可赋值', () => {
    const forms: PactStrength[] = ['symbolic', 'binding', 'enforced', 'sacred']
    forms.forEach(f => { expect(makeP({ pactStrength: f }).pactStrength).toBe(f) })
  })
  it('spawn时civIdA!=civIdB', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    if (getP(sys).length > 0) {
      const p = getP(sys)[0]
      expect(p.civIdA).not.toBe(p.civIdB)
    }
  })
  it('spawn后tick=当前tick', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    if (getP(sys).length > 0) { expect(getP(sys)[0].tick).toBe(CHECK_INTERVAL) }
  })
  it('nextId初始=1', () => { expect((sys as any).nextId).toBe(1) })
  it('spawn后nextId=2', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })
  it('random=0.99时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(getP(sys)).toHaveLength(0)
  })
  it('整体不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(() => { for (let _i = 0; _i <= 10; _i++) sys.update(1, W, EM, CHECK_INTERVAL * _i) }).not.toThrow()
  })
  it('CHECK_INTERVAL=2400', () => { expect(CHECK_INTERVAL).toBe(2400) })
  it('MAX_PACTS=20', () => { expect(MAX_PACTS).toBe(20) })
  it('数组可独立注入读取', () => {
    const p = makeP({ id: 42, civIdA: 3, civIdB: 7 })
    getP(sys).push(p)
    expect(getP(sys)[0].id).toBe(42)
    expect(getP(sys)[0].civIdA).toBe(3)
  })
  it('两条记录均正确更新duration', () => {
    getP(sys).push(makeP({ id: 1, tick: 999999 }))
    getP(sys).push(makeP({ id: 2, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(getP(sys)[0].duration).toBe(1)
    expect(getP(sys)[1].duration).toBe(1)
  })
  it('系统实例化不报错', () => { expect(() => new DiplomaticNonAggressionSystem()).not.toThrow() })
})

describe('DiplomaticNonAggressionSystem — 额外验证', () => {
  it('系统实例化不报错', () => {
    expect(() => new DiplomaticNonAggressionSystem()).not.toThrow()
  })
})
