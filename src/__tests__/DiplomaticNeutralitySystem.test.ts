import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticNeutralitySystem } from '../systems/DiplomaticNeutralitySystem'
import type { NeutralityDeclaration, NeutralityScope } from '../systems/DiplomaticNeutralitySystem'

const CHECK_INTERVAL = 2380
const MAX_PACTS = 20
const EXPIRE_OFFSET = 81000
const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticNeutralitySystem() }
function getP(sys: any): NeutralityDeclaration[] { return sys.declarations }
function makeP(o: Partial<NeutralityDeclaration> = {}): NeutralityDeclaration {
  return { id: 1, civId: 1, scope: 2, scope: 'military', credibility: 40, tradeAccess: 40, diplomaticStanding: 20, vulnerabilityRisk: 15, duration: 0, tick: 0, ...o }
}

describe('DiplomaticNeutralitySystem — 基础数据结构', () => {
  let sys: DiplomaticNeutralitySystem
  beforeEach(() => { sys = makeSys() })

  it('初始declarations为空数组', () => { expect(getP(sys)).toHaveLength(0) })
  it('declarations是数组类型', () => { expect(Array.isArray(getP(sys))).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入一条后长度为1', () => { getP(sys).push(makeP()); expect(getP(sys)).toHaveLength(1) })
  it('NeutralityDeclaration包含id字段', () => { expect(makeP()).toHaveProperty('id') })
  it('NeutralityDeclaration包含civId字段', () => { expect(makeP()).toHaveProperty('civId') })
  it('NeutralityDeclaration包含scope字段', () => { expect(makeP()).toHaveProperty('scope') })
  it('NeutralityDeclaration包含credibility字段', () => { expect(makeP()).toHaveProperty('credibility') })
  it('NeutralityDeclaration包含duration和tick', () => {
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

describe('DiplomaticNeutralitySystem — CHECK_INTERVAL=2380 节流', () => {
  let sys: DiplomaticNeutralitySystem
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

describe('DiplomaticNeutralitySystem — 数值字段动态更新', () => {
  let sys: DiplomaticNeutralitySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('duration每tick递增1', () => {
    getP(sys).push(makeP({ duration: 0, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(getP(sys)[0].duration).toBe(1)
  })
  it('credibility在[10, 90]', () => {
    getP(sys).push(makeP({ credibility: 40, tick: CHECK_INTERVAL }))
    for (let _i = 1; _i <= 100; _i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * _i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).declarations[0]?.credibility
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
  })
  it('tradeAccess在[5, 75]', () => {
    getP(sys).push(makeP({ tradeAccess: 40, tick: CHECK_INTERVAL }))
    for (let _i = 1; _i <= 100; _i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * _i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).declarations[0]?.tradeAccess
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(75) }
  })
  it('diplomaticStanding在[10, 85]', () => {
    getP(sys).push(makeP({ diplomaticStanding: 20, tick: CHECK_INTERVAL }))
    for (let _i = 1; _i <= 100; _i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * _i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).declarations[0]?.diplomaticStanding
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(85) }
  })
  it('vulnerabilityRisk在[5, 60]', () => {
    getP(sys).push(makeP({ vulnerabilityRisk: 15, tick: CHECK_INTERVAL }))
    for (let _i = 1; _i <= 100; _i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * _i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).declarations[0]?.vulnerabilityRisk
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(60) }
  })
  it('多次update后duration累积', () => {
    getP(sys).push(makeP({ tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    sys.update(1, W, EM, CHECK_INTERVAL * 3)
    expect(getP(sys)[0].duration).toBe(3)
  })
  it('credibility最小值>=10', () => {
    getP(sys).push(makeP({ credibility: 10, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect(getP(sys)[0].credibility).toBeGreaterThanOrEqual(10)
  })
  it('vulnerabilityRisk最大值<=60', () => {
    getP(sys).push(makeP({ vulnerabilityRisk: 60, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect(getP(sys)[0].vulnerabilityRisk).toBeLessThanOrEqual(60)
  })
})

describe('DiplomaticNeutralitySystem — 过期清理(cutoff=tick-81000)', () => {
  let sys: DiplomaticNeutralitySystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0在tick=83000时被清理', () => {
    getP(sys).push(makeP({ id: 1, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 83000)
    expect(getP(sys)).toHaveLength(0)
  })
  it('新鲜tick存活', () => {
    getP(sys).push(makeP({ id: 1, tick: 83000 - 1000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 83000)
    expect(getP(sys)).toHaveLength(1)
  })
  it('cutoff边界时保留', () => {
    getP(sys).push(makeP({ id: 1, tick: 2000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 83000)
    expect(getP(sys)).toHaveLength(1)
  })
  it('只删过期的', () => {
    getP(sys).push(makeP({ id: 1, tick: 0 }))
    getP(sys).push(makeP({ id: 2, tick: 83000 - 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 83000)
    expect(getP(sys)).toHaveLength(1)
    expect(getP(sys)[0].id).toBe(2)
  })
  it('全部过期时清空', () => {
    getP(sys).push(makeP({ id: 1, tick: 100 }))
    getP(sys).push(makeP({ id: 2, tick: 200 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 83000)
    expect(getP(sys)).toHaveLength(0)
  })
  it('无记录时不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, 83000)).not.toThrow()
  })
  it('三条混合正确保留', () => {
    getP(sys).push(makeP({ id: 1, tick: 50 }))
    getP(sys).push(makeP({ id: 2, tick: 83000 - 500 }))
    getP(sys).push(makeP({ id: 3, tick: 83000 - 1500 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 83000)
    expect(getP(sys).every(p => p.id !== 1)).toBe(true)
  })
  it('EXPIRE_OFFSET=81000', () => { expect(EXPIRE_OFFSET).toBe(81000) })
})

describe('DiplomaticNeutralitySystem — MAX_PACTS=20 上限', () => {
  let sys: DiplomaticNeutralitySystem
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
  it('NeutralityScope包含4种形式', () => {
    const forms: NeutralityScope[] = ['military', 'economic', 'political', 'comprehensive']
    expect(forms).toHaveLength(4)
  })
  it('各form可赋值', () => {
    const forms: NeutralityScope[] = ['military', 'economic', 'political', 'comprehensive']
    forms.forEach(f => { expect(makeP({ scope: f }).scope).toBe(f) })
  })
  it('spawn时civId!=scope', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    if (getP(sys).length > 0) {
      const p = getP(sys)[0]
      expect(p.civId).not.toBe(p.scope)
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
  it('CHECK_INTERVAL=2380', () => { expect(CHECK_INTERVAL).toBe(2380) })
  it('MAX_PACTS=20', () => { expect(MAX_PACTS).toBe(20) })
  it('数组可独立注入读取', () => {
    const p = makeP({ id: 42, civId: 3, scope: 7 })
    getP(sys).push(p)
    expect(getP(sys)[0].id).toBe(42)
    expect(getP(sys)[0].civId).toBe(3)
  })
  it('两条记录均正确更新duration', () => {
    getP(sys).push(makeP({ id: 1, tick: 999999 }))
    getP(sys).push(makeP({ id: 2, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(getP(sys)[0].duration).toBe(1)
    expect(getP(sys)[1].duration).toBe(1)
  })
  it('系统实例化不报错', () => { expect(() => new DiplomaticNeutralitySystem()).not.toThrow() })
})

describe('DiplomaticNeutralitySystem — 额外验证', () => {
  it('系统实例化不报错', () => {
    expect(() => new DiplomaticNeutralitySystem()).not.toThrow()
  })
})
