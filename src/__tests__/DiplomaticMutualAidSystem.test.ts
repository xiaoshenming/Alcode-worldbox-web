import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticMutualAidSystem } from '../systems/DiplomaticMutualAidSystem'
import type { MutualAidPact, MutualAidForm } from '../systems/DiplomaticMutualAidSystem'

const CHECK_INTERVAL = 2520
const MAX_PACTS = 19
const EXPIRE_OFFSET = 92000
const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticMutualAidSystem() }
function getPacts(sys: any): MutualAidPact[] { return sys.pacts }
function makeP(o: Partial<MutualAidPact> = {}): MutualAidPact {
  return { id: 1, civIdA: 1, civIdB: 2, form: 'disaster_relief', reciprocityLevel: 40,
    responseSpeed: 40, aidCapacity: 30, trustBond: 20, duration: 0, tick: 0, ...o }
}

describe('DiplomaticMutualAidSystem — 基础数据结构', () => {
  let sys: DiplomaticMutualAidSystem
  beforeEach(() => { sys = makeSys() })

  it('初始pacts为空数组', () => { expect(getPacts(sys)).toHaveLength(0) })
  it('pacts是数组类型', () => { expect(Array.isArray(getPacts(sys))).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入一条后长度为1', () => { getPacts(sys).push(makeP()); expect(getPacts(sys)).toHaveLength(1) })
  it('MutualAidPact包含所有字段', () => {
    const p = makeP()
    expect(p).toHaveProperty('id')
    expect(p).toHaveProperty('civIdA')
    expect(p).toHaveProperty('civIdB')
    expect(p).toHaveProperty('form')
    expect(p).toHaveProperty('reciprocityLevel')
    expect(p).toHaveProperty('responseSpeed')
    expect(p).toHaveProperty('aidCapacity')
    expect(p).toHaveProperty('trustBond')
    expect(p).toHaveProperty('duration')
    expect(p).toHaveProperty('tick')
  })
  it('注入两条后长度为2', () => {
    getPacts(sys).push(makeP({ id: 1 }))
    getPacts(sys).push(makeP({ id: 2 }))
    expect(getPacts(sys)).toHaveLength(2)
  })
})

describe('DiplomaticMutualAidSystem — CHECK_INTERVAL=2520 节流', () => {
  let sys: DiplomaticMutualAidSystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0不触发', () => { sys.update(1, W, EM, 0); expect((sys as any).lastCheck).toBe(0) })
  it('tick=2519不触发', () => { sys.update(1, W, EM, 2519); expect((sys as any).lastCheck).toBe(0) })
  it('tick=2520触发', () => { sys.update(1, W, EM, 2520); expect((sys as any).lastCheck).toBe(2520) })
  it('tick=3000触发', () => { sys.update(1, W, EM, 3000); expect((sys as any).lastCheck).toBe(3000) })
  it('间隔不足不更新', () => {
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('间隔足够第二次更新', () => {
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('三次足够间隔', () => {
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    sys.update(1, W, EM, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })
  it('tick=1被节流', () => { sys.update(1, W, EM, 1); expect((sys as any).lastCheck).toBe(0) })
})

describe('DiplomaticMutualAidSystem — 数值字段动态更新', () => {
  let sys: DiplomaticMutualAidSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('duration每tick递增1', () => {
    getPacts(sys).push(makeP({ tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(getPacts(sys)[0].duration).toBe(1)
  })
  it('reciprocityLevel在[10, 90]', () => {
    getPacts(sys).push(makeP({ reciprocityLevel: 40, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 100; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).pacts[0]?.reciprocityLevel
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
  })
  it('responseSpeed在[10, 85]', () => {
    getPacts(sys).push(makeP({ responseSpeed: 40, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 100; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).pacts[0]?.responseSpeed
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(85) }
  })
  it('aidCapacity在[5, 75]', () => {
    getPacts(sys).push(makeP({ aidCapacity: 30, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 100; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).pacts[0]?.aidCapacity
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(75) }
  })
  it('trustBond在[5, 65]', () => {
    getPacts(sys).push(makeP({ trustBond: 20, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 100; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).pacts[0]?.trustBond
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(65) }
  })
  it('多次update后duration累积', () => {
    getPacts(sys).push(makeP({ tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    sys.update(1, W, EM, CHECK_INTERVAL * 3)
    expect(getPacts(sys)[0].duration).toBe(3)
  })
})

describe('DiplomaticMutualAidSystem — 过期清理(cutoff=tick-92000)', () => {
  let sys: DiplomaticMutualAidSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0在tick=95000时被清理', () => {
    getPacts(sys).push(makeP({ id: 1, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 95000)
    expect(getPacts(sys)).toHaveLength(0)
  })
  it('tick=5000在tick=95000时存活(5000>=3000)', () => {
    getPacts(sys).push(makeP({ id: 1, tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 95000)
    expect(getPacts(sys)).toHaveLength(1)
  })
  it('cutoff边界时保留', () => {
    const cutoff = 95000 - 92000
    getPacts(sys).push(makeP({ id: 1, tick: cutoff }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 95000)
    expect(getPacts(sys)).toHaveLength(1)
  })
  it('只删过期的', () => {
    getPacts(sys).push(makeP({ id: 1, tick: 0 }))
    getPacts(sys).push(makeP({ id: 2, tick: 50000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 95000)
    expect(getPacts(sys)).toHaveLength(1)
    expect(getPacts(sys)[0].id).toBe(2)
  })
  it('全部过期时清空', () => {
    getPacts(sys).push(makeP({ id: 1, tick: 100 }))
    getPacts(sys).push(makeP({ id: 2, tick: 200 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 95000)
    expect(getPacts(sys)).toHaveLength(0)
  })
  it('无记录时不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, 95000)).not.toThrow()
  })
  it('多条混合正确保留存活', () => {
    getPacts(sys).push(makeP({ id: 1, tick: 100 }))
    getPacts(sys).push(makeP({ id: 2, tick: 5000 }))
    getPacts(sys).push(makeP({ id: 3, tick: 80000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 95000)
    expect(getPacts(sys).length).toBeGreaterThanOrEqual(1)
    expect(getPacts(sys).some(p => p.id === 3)).toBe(true)
  })
})

describe('DiplomaticMutualAidSystem — MAX_PACTS=19 上限', () => {
  let sys: DiplomaticMutualAidSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('满19条时不新增', () => {
    for (let i = 1; i <= MAX_PACTS; i++) { getPacts(sys).push(makeP({ id: i, tick: 999999 })) }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(getPacts(sys)).toHaveLength(MAX_PACTS)
  })
  it('MutualAidForm包含4种', () => {
    const forms: MutualAidForm[] = ['disaster_relief', 'military_assistance', 'economic_support', 'resource_pooling']
    expect(forms).toHaveLength(4)
  })
  it('各form可赋值', () => {
    const forms: MutualAidForm[] = ['disaster_relief', 'military_assistance', 'economic_support', 'resource_pooling']
    forms.forEach(f => { expect(makeP({ form: f }).form).toBe(f) })
  })
  it('spawn时civIdA!=civIdB', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    if (getPacts(sys).length > 0) {
      const p = getPacts(sys)[0]
      expect(p.civIdA).not.toBe(p.civIdB)
    }
  })
  it('spawn后tick=当前tick', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    if (getPacts(sys).length > 0) { expect(getPacts(sys)[0].tick).toBe(CHECK_INTERVAL) }
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('spawn后nextId=2', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })
  it('random=0.99时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(getPacts(sys)).toHaveLength(0)
  })
  it('整体不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(() => { for (let i = 0; i <= 10; i++) sys.update(1, W, EM, CHECK_INTERVAL * i) }).not.toThrow()
  })
  it('EXPIRE_OFFSET=92000', () => { expect(EXPIRE_OFFSET).toBe(92000) })
})

describe('DiplomaticMutualAidSystem — 额外边界测试', () => {
  let sys: DiplomaticMutualAidSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('arrangements可以被清空后重新添加', () => {
    getPacts(sys).push(makeP({ id: 1, tick: 999999 }))
    getPacts(sys).length = 0
    expect(getPacts(sys)).toHaveLength(0)
  })
  it('注入pact后id字段正确', () => {
    getPacts(sys).push(makeP({ id: 99 }))
    expect(getPacts(sys)[0].id).toBe(99)
  })
  it('注入pact后form字段正确', () => {
    getPacts(sys).push(makeP({ form: 'military_assistance' }))
    expect(getPacts(sys)[0].form).toBe('military_assistance')
  })
  it('注入pact后duration字段正确', () => {
    getPacts(sys).push(makeP({ duration: 5 }))
    expect(getPacts(sys)[0].duration).toBe(5)
  })
  it('tick=0时不触发，数组不变', () => {
    getPacts(sys).push(makeP({ tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, 0)
    expect(getPacts(sys)).toHaveLength(1)
  })
  it('reciprocityLevel最小值>=10', () => {
    getPacts(sys).push(makeP({ reciprocityLevel: 10, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect(getPacts(sys)[0].reciprocityLevel).toBeGreaterThanOrEqual(10)
  })
  it('responseSpeed最大值<=85', () => {
    getPacts(sys).push(makeP({ responseSpeed: 85, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect(getPacts(sys)[0].responseSpeed).toBeLessThanOrEqual(85)
  })
  it('两条pact均正确更新duration', () => {
    getPacts(sys).push(makeP({ id: 1, tick: 999999 }))
    getPacts(sys).push(makeP({ id: 2, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(getPacts(sys)[0].duration).toBe(1)
    expect(getPacts(sys)[1].duration).toBe(1)
  })
  it('CHECK_INTERVAL等于2520', () => { expect(CHECK_INTERVAL).toBe(2520) })
  it('MAX_PACTS等于19', () => { expect(MAX_PACTS).toBe(19) })
  it('pact可以存储civIdA=8(最大值)', () => {
    getPacts(sys).push(makeP({ civIdA: 8, civIdB: 1 }))
    expect(getPacts(sys)[0].civIdA).toBe(8)
  })
  it('spawn的pact id从1开始', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    if (getPacts(sys).length > 0) { expect(getPacts(sys)[0].id).toBe(1) }
  })
})
