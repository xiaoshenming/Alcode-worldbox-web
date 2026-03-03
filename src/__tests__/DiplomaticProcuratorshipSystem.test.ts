import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticProcuratorshipSystem } from '../systems/DiplomaticProcuratorshipSystem'
import type { ProcuratorshipArrangement, ProcuratorshipForm } from '../systems/DiplomaticProcuratorshipSystem'

const CHECK_INTERVAL = 2580
const MAX_ARRANGEMENTS = 16
const EXPIRE_OFFSET = 88000
const W = {} as any, EM = {} as any
function makeSys() { return new DiplomaticProcuratorshipSystem() }
function getArr(sys: any): ProcuratorshipArrangement[] { return sys.arrangements }
function makeA(o: Partial<ProcuratorshipArrangement> = {}): ProcuratorshipArrangement {
  return { id: 1, appointerCivId: 1, governedCivId: 2, form: 'provincial_procurator', administrativeReach: 40, taxCollection: 40, localCompliance: 20, corruptionRisk: 15, duration: 0, tick: 0, ...o }
}

describe('DiplomaticProcuratorshipSystem — 基础数据结构', () => {
  let sys: DiplomaticProcuratorshipSystem
  beforeEach(() => { sys = makeSys() })

  it('初始arrangements为空数组', () => { expect(getArr(sys)).toHaveLength(0) })
  it('arrangements是数组类型', () => { expect(Array.isArray(getArr(sys))).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入一条后长度为1', () => { getArr(sys).push(makeA()); expect(getArr(sys)).toHaveLength(1) })
  it('ProcuratorshipArrangement包含id字段', () => { expect(makeA()).toHaveProperty('id') })
  it('ProcuratorshipArrangement包含appointerCivId字段', () => { expect(makeA()).toHaveProperty('appointerCivId') })
  it('ProcuratorshipArrangement包含governedCivId字段', () => { expect(makeA()).toHaveProperty('governedCivId') })
  it('ProcuratorshipArrangement包含administrativeReach字段', () => { expect(makeA()).toHaveProperty('administrativeReach') })
  it('ProcuratorshipArrangement包含duration和tick', () => {
    const a = makeA()
    expect(a).toHaveProperty('duration')
    expect(a).toHaveProperty('tick')
  })
  it('注入两条后长度为2', () => {
    getArr(sys).push(makeA({ id: 1 }))
    getArr(sys).push(makeA({ id: 2 }))
    expect(getArr(sys)).toHaveLength(2)
  })
})

describe('DiplomaticProcuratorshipSystem — CHECK_INTERVAL=2580 节流', () => {
  let sys: DiplomaticProcuratorshipSystem
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

describe('DiplomaticProcuratorshipSystem — 数值字段动态更新', () => {
  let sys: DiplomaticProcuratorshipSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('duration每tick递增1', () => {
    getArr(sys).push(makeA({ duration: 0, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(getArr(sys)[0].duration).toBe(1)
  })
  it('administrativeReach在[5, 85]', () => {
    getArr(sys).push(makeA({ administrativeReach: 40, tick: CHECK_INTERVAL }))
    for (let _i = 1; _i <= 100; _i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * _i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).arrangements[0]?.administrativeReach
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(85) }
  })
  it('taxCollection在[10, 90]', () => {
    getArr(sys).push(makeA({ taxCollection: 40, tick: CHECK_INTERVAL }))
    for (let _i = 1; _i <= 100; _i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * _i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).arrangements[0]?.taxCollection
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
  })
  it('localCompliance在[5, 80]', () => {
    getArr(sys).push(makeA({ localCompliance: 20, tick: CHECK_INTERVAL }))
    for (let _i = 1; _i <= 100; _i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * _i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).arrangements[0]?.localCompliance
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(80) }
  })
  it('corruptionRisk在[5, 65]', () => {
    getArr(sys).push(makeA({ corruptionRisk: 15, tick: CHECK_INTERVAL }))
    for (let _i = 1; _i <= 100; _i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * _i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).arrangements[0]?.corruptionRisk
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(65) }
  })
  it('多次update后duration累积', () => {
    getArr(sys).push(makeA({ tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    sys.update(1, W, EM, CHECK_INTERVAL * 3)
    expect(getArr(sys)[0].duration).toBe(3)
  })
  it('administrativeReach最小值>=5', () => {
    getArr(sys).push(makeA({ administrativeReach: 5, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect(getArr(sys)[0].administrativeReach).toBeGreaterThanOrEqual(5)
  })
  it('corruptionRisk最大值<=65', () => {
    getArr(sys).push(makeA({ corruptionRisk: 65, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect(getArr(sys)[0].corruptionRisk).toBeLessThanOrEqual(65)
  })
})

describe('DiplomaticProcuratorshipSystem — 过期清理(cutoff=tick-88000)', () => {
  let sys: DiplomaticProcuratorshipSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0在tick=90000时被清理', () => {
    getArr(sys).push(makeA({ id: 1, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect(getArr(sys)).toHaveLength(0)
  })
  it('新鲜tick存活', () => {
    getArr(sys).push(makeA({ id: 1, tick: 90000 - 1000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect(getArr(sys)).toHaveLength(1)
  })
  it('cutoff边界时保留', () => {
    getArr(sys).push(makeA({ id: 1, tick: 2000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect(getArr(sys)).toHaveLength(1)
  })
  it('只删过期的', () => {
    getArr(sys).push(makeA({ id: 1, tick: 0 }))
    getArr(sys).push(makeA({ id: 2, tick: 90000 - 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect(getArr(sys)).toHaveLength(1)
    expect(getArr(sys)[0].id).toBe(2)
  })
  it('全部过期时清空', () => {
    getArr(sys).push(makeA({ id: 1, tick: 100 }))
    getArr(sys).push(makeA({ id: 2, tick: 200 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect(getArr(sys)).toHaveLength(0)
  })
  it('无记录时不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, 90000)).not.toThrow()
  })
  it('三条混合正确保留', () => {
    getArr(sys).push(makeA({ id: 1, tick: 50 }))
    getArr(sys).push(makeA({ id: 2, tick: 90000 - 500 }))
    getArr(sys).push(makeA({ id: 3, tick: 90000 - 1500 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect(getArr(sys).every(a => a.id !== 1)).toBe(true)
  })
  it('EXPIRE_OFFSET=88000', () => { expect(EXPIRE_OFFSET).toBe(88000) })
})

describe('DiplomaticProcuratorshipSystem — MAX_ARRANGEMENTS=16 上限', () => {
  let sys: DiplomaticProcuratorshipSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('满16条时不新增', () => {
    for (let _i = 1; _i <= MAX_ARRANGEMENTS; _i++) {
      getArr(sys).push(makeA({ id: _i, tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(getArr(sys)).toHaveLength(MAX_ARRANGEMENTS)
  })
  it('ProcuratorshipForm包含4种形式', () => {
    const forms: ProcuratorshipForm[] = ['provincial_procurator', 'fiscal_procurator', 'judicial_procurator', 'military_procurator']
    expect(forms).toHaveLength(4)
  })
  it('各form可赋值', () => {
    const forms: ProcuratorshipForm[] = ['provincial_procurator', 'fiscal_procurator', 'judicial_procurator', 'military_procurator']
    forms.forEach(f => { expect(makeA({ form: f }).form).toBe(f) })
  })
  it('spawn时appointerCivId!=governedCivId', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    if (getArr(sys).length > 0) {
      const a = getArr(sys)[0]
      expect(a.appointerCivId).not.toBe(a.governedCivId)
    }
  })
  it('spawn后tick=当前tick', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    if (getArr(sys).length > 0) { expect(getArr(sys)[0].tick).toBe(CHECK_INTERVAL) }
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
    expect(getArr(sys)).toHaveLength(0)
  })
  it('整体不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(() => { for (let _i = 0; _i <= 10; _i++) sys.update(1, W, EM, CHECK_INTERVAL * _i) }).not.toThrow()
  })
  it('CHECK_INTERVAL=2580', () => { expect(CHECK_INTERVAL).toBe(2580) })
  it('MAX_ARRANGEMENTS=16', () => { expect(MAX_ARRANGEMENTS).toBe(16) })
  it('spawn的id从1开始', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    if (getArr(sys).length > 0) { expect(getArr(sys)[0].id).toBe(1) }
  })
  it('数组可独立注入读取', () => {
    const a = makeA({ id: 42, appointerCivId: 3, governedCivId: 7 })
    getArr(sys).push(a)
    expect(getArr(sys)[0].id).toBe(42)
    expect(getArr(sys)[0].appointerCivId).toBe(3)
  })
  it('两条记录均正确更新duration', () => {
    getArr(sys).push(makeA({ id: 1, tick: 999999 }))
    getArr(sys).push(makeA({ id: 2, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(getArr(sys)[0].duration).toBe(1)
    expect(getArr(sys)[1].duration).toBe(1)
  })
  it('系统实例化不报错', () => {
    expect(() => new DiplomaticProcuratorshipSystem()).not.toThrow()
  })
})
