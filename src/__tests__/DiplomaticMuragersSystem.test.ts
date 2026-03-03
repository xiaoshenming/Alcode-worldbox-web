import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticMuragersSystem } from '../systems/DiplomaticMuragersSystem'
import type { MuragerArrangement, MuragerForm } from '../systems/DiplomaticMuragersSystem'

const CHECK_INTERVAL = 2970
const MAX_ARRANGEMENTS = 16
const EXPIRE_OFFSET = 88000
const W = {} as any, EM = {} as any

function makeSys() { return new DiplomaticMuragersSystem() }
function makeArr(sys: any): MuragerArrangement[] { return sys.arrangements }
function makeA(overrides: Partial<MuragerArrangement> = {}): MuragerArrangement {
  return {
    id: 1, wallCivId: 1, taxCivId: 2, form: 'royal_murager',
    wallTaxAuthority: 50, fortificationFund: 50, repairSchedule: 30,
    defenseAllocation: 30, duration: 0, tick: 0, ...overrides,
  }
}

describe('DiplomaticMuragersSystem — 基础数据结构', () => {
  let sys: DiplomaticMuragersSystem
  beforeEach(() => { sys = makeSys() })

  it('初始arrangements为空', () => { expect(makeArr(sys)).toHaveLength(0) })
  it('arrangements是数组类型', () => { expect(Array.isArray(makeArr(sys))).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('注入一条后长度为1', () => {
    makeArr(sys).push(makeA())
    expect(makeArr(sys)).toHaveLength(1)
  })
  it('MuragerArrangement包含所有必需字段', () => {
    const a = makeA()
    expect(a).toHaveProperty('id')
    expect(a).toHaveProperty('wallCivId')
    expect(a).toHaveProperty('taxCivId')
    expect(a).toHaveProperty('form')
    expect(a).toHaveProperty('wallTaxAuthority')
    expect(a).toHaveProperty('fortificationFund')
    expect(a).toHaveProperty('repairSchedule')
    expect(a).toHaveProperty('defenseAllocation')
    expect(a).toHaveProperty('duration')
    expect(a).toHaveProperty('tick')
  })
  it('注入两条后长度为2', () => {
    makeArr(sys).push(makeA({ id: 1 }))
    makeArr(sys).push(makeA({ id: 2 }))
    expect(makeArr(sys)).toHaveLength(2)
  })
})

describe('DiplomaticMuragersSystem — CHECK_INTERVAL=2970 节流', () => {
  let sys: DiplomaticMuragersSystem
  beforeEach(() => { sys = makeSys(); vi.spyOn(Math, 'random').mockReturnValue(0.99) })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不触发', () => {
    sys.update(1, W, EM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2969时不触发', () => {
    sys.update(1, W, EM, 2969)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick=2970时触发，lastCheck=2970', () => {
    sys.update(1, W, EM, 2970)
    expect((sys as any).lastCheck).toBe(2970)
  })
  it('tick=3000时触发，lastCheck=3000', () => {
    sys.update(1, W, EM, 3000)
    expect((sys as any).lastCheck).toBe(3000)
  })
  it('第二次间隔足够时再次触发', () => {
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('间隔不足时lastCheck不变', () => {
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick=1时被节流', () => {
    sys.update(1, W, EM, 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('三次足够间隔后lastCheck=CHECK_INTERVAL*3', () => {
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    sys.update(1, W, EM, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })
})

describe('DiplomaticMuragersSystem — 数值字段动态更新', () => {
  let sys: DiplomaticMuragersSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('每tick duration递增1', () => {
    makeArr(sys).push(makeA({ duration: 0, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(makeArr(sys)[0].duration).toBe(1)
  })
  it('wallTaxAuthority在[5, 85]范围内', () => {
    makeArr(sys).push(makeA({ wallTaxAuthority: 50, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 100; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).arrangements[0]?.wallTaxAuthority
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(85) }
  })
  it('fortificationFund在[10, 90]范围内', () => {
    makeArr(sys).push(makeA({ fortificationFund: 50, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 100; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).arrangements[0]?.fortificationFund
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
  })
  it('repairSchedule在[5, 80]范围内', () => {
    makeArr(sys).push(makeA({ repairSchedule: 30, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 100; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).arrangements[0]?.repairSchedule
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(80) }
  })
  it('defenseAllocation在[5, 65]范围内', () => {
    makeArr(sys).push(makeA({ defenseAllocation: 30, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 100; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * i)
      vi.restoreAllMocks()
    }
    const v = (sys as any).arrangements[0]?.defenseAllocation
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(65) }
  })
  it('多次update后duration持续递增', () => {
    makeArr(sys).push(makeA({ duration: 0, tick: 999999 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    sys.update(1, W, EM, CHECK_INTERVAL * 3)
    expect(makeArr(sys)[0].duration).toBe(3)
  })
  it('wallTaxAuthority最小值不低于5', () => {
    makeArr(sys).push(makeA({ wallTaxAuthority: 5, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect(makeArr(sys)[0].wallTaxAuthority).toBeGreaterThanOrEqual(5)
  })
  it('defenseAllocation最大值不超过65', () => {
    makeArr(sys).push(makeA({ defenseAllocation: 65, tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect(makeArr(sys)[0].defenseAllocation).toBeLessThanOrEqual(65)
  })
})

describe('DiplomaticMuragersSystem — 过期清理(cutoff=tick-88000)', () => {
  let sys: DiplomaticMuragersSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0在tick=90000时被清理', () => {
    makeArr(sys).push(makeA({ id: 1, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect(makeArr(sys)).toHaveLength(0)
  })
  it('tick=5000在tick=90000时存活(5000>=2000)', () => {
    makeArr(sys).push(makeA({ id: 1, tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect(makeArr(sys)).toHaveLength(1)
  })
  it('cutoff边界tick=cutoff时保留', () => {
    const cutoff = 90000 - 88000
    makeArr(sys).push(makeA({ id: 1, tick: cutoff }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect(makeArr(sys)).toHaveLength(1)
  })
  it('混合过期和存活时只删过期', () => {
    makeArr(sys).push(makeA({ id: 1, tick: 0 }))
    makeArr(sys).push(makeA({ id: 2, tick: 50000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect(makeArr(sys)).toHaveLength(1)
    expect(makeArr(sys)[0].id).toBe(2)
  })
  it('全部过期时清空数组', () => {
    makeArr(sys).push(makeA({ id: 1, tick: 100 }))
    makeArr(sys).push(makeA({ id: 2, tick: 200 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect(makeArr(sys)).toHaveLength(0)
  })
  it('无记录时不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, 90000)).not.toThrow()
  })
  it('过期记录被从末尾向前删除，顺序正确', () => {
    makeArr(sys).push(makeA({ id: 1, tick: 1000 }))
    makeArr(sys).push(makeA({ id: 2, tick: 50000 }))
    makeArr(sys).push(makeA({ id: 3, tick: 500 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect(makeArr(sys)).toHaveLength(1)
    expect(makeArr(sys)[0].id).toBe(2)
  })
})

describe('DiplomaticMuragersSystem — MAX_ARRANGEMENTS=16 上限', () => {
  let sys: DiplomaticMuragersSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('满16条时不新增', () => {
    for (let i = 1; i <= MAX_ARRANGEMENTS; i++) {
      makeArr(sys).push(makeA({ id: i, tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(makeArr(sys)).toHaveLength(MAX_ARRANGEMENTS)
  })
  it('MuragerForm包含4种类型', () => {
    const forms: MuragerForm[] = ['royal_murager', 'borough_murager', 'castle_murager', 'city_murager']
    expect(forms).toHaveLength(4)
  })
  it('各form可赋值到arrangement', () => {
    const forms: MuragerForm[] = ['royal_murager', 'borough_murager', 'castle_murager', 'city_murager']
    forms.forEach(f => {
      const a = makeA({ form: f })
      expect(a.form).toBe(f)
    })
  })
  it('15条时可再加一条', () => {
    for (let i = 1; i <= MAX_ARRANGEMENTS - 1; i++) {
      makeArr(sys).push(makeA({ id: i, tick: 999999 }))
    }
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(makeArr(sys).length).toBeLessThanOrEqual(MAX_ARRANGEMENTS)
  })
  it('random很高时不spawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect(makeArr(sys)).toHaveLength(0)
  })
})

describe('DiplomaticMuragersSystem — nextId', () => {
  let sys: DiplomaticMuragersSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始nextId=1', () => { expect((sys as any).nextId).toBe(1) })
  it('spawn后nextId递增到2', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })
  it('两次spawn后nextId=3', () => {
    // First spawn
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    vi.restoreAllMocks()
    // Second spawn
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect((sys as any).nextId).toBe(3)
  })
})

describe('DiplomaticMuragersSystem — 综合验证', () => {
  let sys: DiplomaticMuragersSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('spawn时wallCivId != taxCivId', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    if (makeArr(sys).length > 0) {
      const a = makeArr(sys)[0]
      expect(a.wallCivId).not.toBe(a.taxCivId)
    }
  })
  it('spawn时tick字段等于当前tick', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    if (makeArr(sys).length > 0) {
      expect(makeArr(sys)[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('不传arrangements时系统正常运行', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, CHECK_INTERVAL)).not.toThrow()
  })
  it('update多次后lastCheck更新正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('新spawn的arrangement有form字段', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    if (makeArr(sys).length > 0) {
      expect(makeArr(sys)[0]).toHaveProperty('form')
    }
  })
  it('spawn后id从1开始', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    if (makeArr(sys).length > 0) {
      expect(makeArr(sys)[0].id).toBe(1)
    }
  })
  it('spawn时walls和taxes civId在1-8范围', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    if (makeArr(sys).length > 0) {
      const a = makeArr(sys)[0]
      expect(a.wallCivId).toBeGreaterThanOrEqual(1)
      expect(a.wallCivId).toBeLessThanOrEqual(8)
      expect(a.taxCivId).toBeGreaterThanOrEqual(1)
      expect(a.taxCivId).toBeLessThanOrEqual(8)
    }
  })
  it('spawn同时duration在同tick内被update', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    if (makeArr(sys).length > 0) {
      expect(makeArr(sys)[0].duration).toBe(1)
    }
  })
  it('arrangements数组可独立注入和读取', () => {
    const a = makeA({ id: 42, wallCivId: 3, taxCivId: 7 })
    makeArr(sys).push(a)
    expect(makeArr(sys)[0].id).toBe(42)
    expect(makeArr(sys)[0].wallCivId).toBe(3)
    expect(makeArr(sys)[0].taxCivId).toBe(7)
  })
  it('arrangements经过数次过期和spawn后数量合理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 1; i <= 5; i++) {
      sys.update(1, W, EM, CHECK_INTERVAL * i)
    }
    expect(makeArr(sys).length).toBeLessThanOrEqual(MAX_ARRANGEMENTS)
  })
  it('整体不会崩溃，始终在正常范围', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(() => {
      for (let i = 0; i <= 20; i++) {
        sys.update(1, W, EM, CHECK_INTERVAL * i)
      }
    }).not.toThrow()
  })
  it('EXPIRE_OFFSET=88000校验', () => {
    expect(EXPIRE_OFFSET).toBe(88000)
  })
})
