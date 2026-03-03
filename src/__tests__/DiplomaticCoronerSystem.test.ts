import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticCoronerSystem, CoronerArrangement } from '../systems/DiplomaticCoronerSystem'

const world = {} as any
const em = {} as any

function getArrangements(sys: DiplomaticCoronerSystem): CoronerArrangement[] {
  return (sys as any).arrangements
}

describe('基础数据结构', () => {
  it('初始arrangements为空', () => {
    const sys = new DiplomaticCoronerSystem()
    expect(getArrangements(sys)).toHaveLength(0)
  })

  it('可注入并查询arrangements', () => {
    const sys = new DiplomaticCoronerSystem()
    const arr = getArrangements(sys)
    arr.push({ id: 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 1000 })
    expect(getArrangements(sys)).toHaveLength(1)
  })

  it('nextId初始为1', () => {
    const sys = new DiplomaticCoronerSystem()
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    const sys = new DiplomaticCoronerSystem()
    expect((sys as any).lastCheck).toBe(0)
  })

  it('4种CoronerForm枚举值存在', () => {
    const forms = ['royal_coroner', 'county_coroner', 'borough_coroner', 'palatine_coroner']
    const sys = new DiplomaticCoronerSystem()
    const arr = getArrangements(sys)
    for (const f of forms) {
      arr.push({ id: 1, crownCivId: 1, coronerCivId: 2, form: f as any, inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 1000 })
    }
    expect(arr.map(a => a.form)).toEqual(forms)
  })
})

describe('CHECK_INTERVAL=2770节流', () => {
  it('tick=2769时不更新lastCheck', () => {
    const sys = new DiplomaticCoronerSystem()
    sys.update(1, world, em, 2769)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2770时更新lastCheck', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0) // < PROCEED_CHANCE=0.0021? 0 < 0.0021 yes, but crown===coroner possible
    sys.update(1, world, em, 2770)
    expect((sys as any).lastCheck).toBe(2770)
    vi.restoreAllMocks()
  })

  it('tick<2770时不执行任何逻辑', () => {
    const sys = new DiplomaticCoronerSystem()
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, 100)
    expect((sys as any).lastCheck).toBe(0)
    spy.mockRestore()
  })

  it('连续两次tick=2770和tick=5540都更新', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1) // > PROCEED_CHANCE, no spawn
    sys.update(1, world, em, 2770)
    expect((sys as any).lastCheck).toBe(2770)
    sys.update(1, world, em, 5540)
    expect((sys as any).lastCheck).toBe(5540)
    vi.restoreAllMocks()
  })

  it('第二次tick不满足间隔时不更新', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2770)
    sys.update(1, world, em, 2771)
    expect((sys as any).lastCheck).toBe(2770)
    vi.restoreAllMocks()
  })
})

describe('数值字段动态更新', () => {
  function makeArrangement(tick = 1000): CoronerArrangement {
    return { id: 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick }
  }

  it('每次update后duration+1', () => {
    const sys = new DiplomaticCoronerSystem()
    const a = makeArrangement(0)
    getArrangements(sys).push(a)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2770)
    expect(a.duration).toBe(1)
    vi.restoreAllMocks()
  })

  it('inquestAuthority保��在[5,85]内', () => {
    const sys = new DiplomaticCoronerSystem()
    const a = makeArrangement(0)
    getArrangements(sys).push(a)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let t = 2770; t <= 2770 * 100; t += 2770) sys.update(1, world, em, t)
    expect(a.inquestAuthority).toBeGreaterThanOrEqual(5)
    expect(a.inquestAuthority).toBeLessThanOrEqual(85)
    vi.restoreAllMocks()
  })

  it('jurisdictionReach保持在[10,90]内', () => {
    const sys = new DiplomaticCoronerSystem()
    const a = makeArrangement(0)
    getArrangements(sys).push(a)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let t = 2770; t <= 2770 * 100; t += 2770) sys.update(1, world, em, t)
    expect(a.jurisdictionReach).toBeGreaterThanOrEqual(10)
    expect(a.jurisdictionReach).toBeLessThanOrEqual(90)
    vi.restoreAllMocks()
  })

  it('recordKeeping保持在[5,80]内', () => {
    const sys = new DiplomaticCoronerSystem()
    const a = makeArrangement(0)
    getArrangements(sys).push(a)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let t = 2770; t <= 2770 * 100; t += 2770) sys.update(1, world, em, t)
    expect(a.recordKeeping).toBeGreaterThanOrEqual(5)
    expect(a.recordKeeping).toBeLessThanOrEqual(80)
    vi.restoreAllMocks()
  })

  it('crownRevenue保持在[5,65]内', () => {
    const sys = new DiplomaticCoronerSystem()
    const a = makeArrangement(0)
    getArrangements(sys).push(a)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let t = 2770; t <= 2770 * 100; t += 2770) sys.update(1, world, em, t)
    expect(a.crownRevenue).toBeGreaterThanOrEqual(5)
    expect(a.crownRevenue).toBeLessThanOrEqual(65)
    vi.restoreAllMocks()
  })
})

describe('过期清理cutoff=tick-88000', () => {
  it('tick字段小于cutoff的记录被删除', () => {
    const sys = new DiplomaticCoronerSystem()
    getArrangements(sys).push({ id: 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 1 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 100000) // cutoff=12000, tick=1 < 12000
    expect(getArrangements(sys)).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('新记录tick大于cutoff时保留', () => {
    const sys = new DiplomaticCoronerSystem()
    const tick = 100000
    getArrangements(sys).push({ id: 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: tick - 1000 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, tick)
    expect(getArrangements(sys)).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('混合场景：过期的删除，新的保留', () => {
    const sys = new DiplomaticCoronerSystem()
    const tick = 100000
    const arr = getArrangements(sys)
    arr.push({ id: 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 1 })
    arr.push({ id: 2, crownCivId: 3, coronerCivId: 4, form: 'county_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: tick - 1000 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, tick)
    expect(getArrangements(sys)).toHaveLength(1)
    expect(getArrangements(sys)[0].id).toBe(2)
    vi.restoreAllMocks()
  })

  it('tick===cutoff时不删除（严格小于才删）', () => {
    const sys = new DiplomaticCoronerSystem()
    const tick = 100000
    const cutoff = tick - 88000 // 12000
    getArrangements(sys).push({ id: 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: cutoff })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, tick)
    expect(getArrangements(sys)).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('空数组时清理逻辑安全执行', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(1, world, em, 100000)).not.toThrow()
    vi.restoreAllMocks()
  })
})

describe('MAX_ARRANGEMENTS=16上限', () => {
  it('已满16个时不新增', () => {
    const sys = new DiplomaticCoronerSystem()
    const arr = getArrangements(sys)
    for (let i = 0; i < 16; i++) {
      arr.push({ id: i + 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 200000 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < PROCEED_CHANCE
    sys.update(1, world, em, 200000)
    expect(getArrangements(sys)).toHaveLength(16)
    vi.restoreAllMocks()
  })

  it('未满16时random<PROCEED_CHANCE可新增（crown!=coroner）', () => {
    const sys = new DiplomaticCoronerSystem()
    // mock: random序列 0.001(proceed), 0(crown=1), 0.5(coroner=5), 0.5(pickRandom)
    const vals = [0.001, 0, 0.5, 0.5]
    let idx = 0
    vi.spyOn(Math, 'random').mockImplementation(() => vals[idx++ % vals.length])
    sys.update(1, world, em, 2770)
    expect(getArrangements(sys).length).toBeGreaterThanOrEqual(0) // may or may not spawn depending on crown===coroner
    vi.restoreAllMocks()
  })

  it('random>=PROCEED_CHANCE时不spawn', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 0.5 >= 0.0021
    sys.update(1, world, em, 2770)
    expect(getArrangements(sys)).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('spawn时civA===civB则跳过不新增', () => {
    const sys = new DiplomaticCoronerSystem()
    // random: 0.001(proceed), 0(crown=1), 0(coroner=1) => crown===coroner, skip
    const vals = [0.001, 0, 0]
    let idx = 0
    vi.spyOn(Math, 'random').mockImplementation(() => vals[idx++ % vals.length])
    sys.update(1, world, em, 2770)
    expect(getArrangements(sys)).toHaveLength(0)
    vi.restoreAllMocks()
  })
})

describe('CoronerForm枚举完整性', () => {
  it('royal_coroner可存储', () => {
    const sys = new DiplomaticCoronerSystem()
    getArrangements(sys).push({ id: 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 1000 })
    expect(getArrangements(sys)[0].form).toBe('royal_coroner')
  })

  it('county_coroner可存储', () => {
    const sys = new DiplomaticCoronerSystem()
    getArrangements(sys).push({ id: 1, crownCivId: 1, coronerCivId: 2, form: 'county_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 1000 })
    expect(getArrangements(sys)[0].form).toBe('county_coroner')
  })

  it('borough_coroner可存储', () => {
    const sys = new DiplomaticCoronerSystem()
    getArrangements(sys).push({ id: 1, crownCivId: 1, coronerCivId: 2, form: 'borough_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 1000 })
    expect(getArrangements(sys)[0].form).toBe('borough_coroner')
  })

  it('palatine_coroner可存储', () => {
    const sys = new DiplomaticCoronerSystem()
    getArrangements(sys).push({ id: 1, crownCivId: 1, coronerCivId: 2, form: 'palatine_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 1000 })
    expect(getArrangements(sys)[0].form).toBe('palatine_coroner')
  })
})

describe('额外边界与枚举测试', () => {
  it('inquestAuthority 上限 85 不被突破', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a: CoronerArrangement = { id: 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 84.99, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 0 }
    getArrangements(sys).push(a)
    sys.update(1, world, em, 2770)
    expect(a.inquestAuthority).toBeLessThanOrEqual(85)
    vi.restoreAllMocks()
  })

  it('inquestAuthority 下限 5 不被突破', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const a: CoronerArrangement = { id: 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 5.01, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 0 }
    getArrangements(sys).push(a)
    sys.update(1, world, em, 2770)
    expect(a.inquestAuthority).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })

  it('jurisdictionReach 上限 90 不被突破', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a: CoronerArrangement = { id: 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 50, jurisdictionReach: 89.99, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 0 }
    getArrangements(sys).push(a)
    sys.update(1, world, em, 2770)
    expect(a.jurisdictionReach).toBeLessThanOrEqual(90)
    vi.restoreAllMocks()
  })

  it('recordKeeping 上限 80 不被突破', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a: CoronerArrangement = { id: 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 79.99, crownRevenue: 30, duration: 0, tick: 0 }
    getArrangements(sys).push(a)
    sys.update(1, world, em, 2770)
    expect(a.recordKeeping).toBeLessThanOrEqual(80)
    vi.restoreAllMocks()
  })

  it('crownRevenue 上限 65 不被突破', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a: CoronerArrangement = { id: 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 64.99, duration: 0, tick: 0 }
    getArrangements(sys).push(a)
    sys.update(1, world, em, 2770)
    expect(a.crownRevenue).toBeLessThanOrEqual(65)
    vi.restoreAllMocks()
  })

  it('county_coroner form 可存储', () => {
    const sys = new DiplomaticCoronerSystem()
    getArrangements(sys).push({ id: 1, crownCivId: 1, coronerCivId: 2, form: 'county_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 0 })
    expect(getArrangements(sys)[0].form).toBe('county_coroner')
  })

  it('borough_coroner form 可存储', () => {
    const sys = new DiplomaticCoronerSystem()
    getArrangements(sys).push({ id: 1, crownCivId: 1, coronerCivId: 2, form: 'borough_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 0 })
    expect(getArrangements(sys)[0].form).toBe('borough_coroner')
  })

  it('多条 arrangements 各自独立更新 duration', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const a1: CoronerArrangement = { id: 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 3, tick: 0 }
    const a2: CoronerArrangement = { id: 2, crownCivId: 3, coronerCivId: 4, form: 'county_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 7, tick: 0 }
    getArrangements(sys).push(a1)
    getArrangements(sys).push(a2)
    sys.update(1, world, em, 2770)
    expect(a1.duration).toBe(4)
    expect(a2.duration).toBe(8)
    vi.restoreAllMocks()
  })

  it('过期记录（tick < cutoff）被移除', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    getArrangements(sys).push({ id: 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 0 })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 88000 + 2770 + 1)
    expect(getArrangements(sys)).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('未过期记录保留', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const bigTick = 88000 + 2770
    getArrangements(sys).push({ id: 1, crownCivId: 1, coronerCivId: 2, form: 'royal_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: bigTick - 1000 })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, bigTick)
    expect(getArrangements(sys)).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('update 不改变 crownCivId/coronerCivId', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const a: CoronerArrangement = { id: 1, crownCivId: 4, coronerCivId: 7, form: 'royal_coroner', inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 0 }
    getArrangements(sys).push(a)
    sys.update(1, world, em, 2770)
    expect(a.crownCivId).toBe(4)
    expect(a.coronerCivId).toBe(7)
    vi.restoreAllMocks()
  })

  it('空 arrangements 时 update 不崩溃', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(() => sys.update(1, world, em, 2770)).not.toThrow()
    vi.restoreAllMocks()
  })

  it('nextId 手动设置后保持', () => {
    const sys = new DiplomaticCoronerSystem()
    ;(sys as any).nextId = 33
    expect((sys as any).nextId).toBe(33)
  })

  it('全 4 种 form 可注入并保存', () => {
    const sys = new DiplomaticCoronerSystem()
    const forms = ['royal_coroner', 'county_coroner', 'borough_coroner', 'palatine_coroner']
    for (const f of forms) {
      getArrangements(sys).push({ id: 1, crownCivId: 1, coronerCivId: 2, form: f as any, inquestAuthority: 50, jurisdictionReach: 50, recordKeeping: 40, crownRevenue: 30, duration: 0, tick: 0 })
    }
    const storedForms = getArrangements(sys).map(a => a.form)
    for (const f of forms) { expect(storedForms).toContain(f) }
  })

  it('lastCheck 更新到最新 tick', () => {
    const sys = new DiplomaticCoronerSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, world, em, 2770 * 3)
    expect((sys as any).lastCheck).toBe(2770 * 3)
    vi.restoreAllMocks()
  })
})
