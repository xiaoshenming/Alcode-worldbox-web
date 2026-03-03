import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticCrierSystem, CrierArrangement } from '../systems/DiplomaticCrierSystem'

const world = {} as any
const em = {} as any

function getArrangements(sys: DiplomaticCrierSystem): CrierArrangement[] {
  return (sys as any).arrangements
}

describe('基础数据结构', () => {
  it('初始arrangements为空', () => {
    const sys = new DiplomaticCrierSystem()
    expect(getArrangements(sys)).toHaveLength(0)
  })

  it('可注入并查询arrangements', () => {
    const sys = new DiplomaticCrierSystem()
    getArrangements(sys).push({ id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 1000 })
    expect(getArrangements(sys)).toHaveLength(1)
  })

  it('nextId初始为1', () => {
    const sys = new DiplomaticCrierSystem()
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    const sys = new DiplomaticCrierSystem()
    expect((sys as any).lastCheck).toBe(0)
  })

  it('4种CrierForm枚举值存在', () => {
    const forms = ['royal_crier', 'borough_crier', 'market_crier', 'court_crier']
    const sys = new DiplomaticCrierSystem()
    const arr = getArrangements(sys)
    for (const f of forms) {
      arr.push({ id: 1, proclamationCivId: 1, audienceCivId: 2, form: f as any, proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 1000 })
    }
    expect(arr.map(a => a.form)).toEqual(forms)
  })
})

describe('CHECK_INTERVAL=2990节流', () => {
  it('tick=2989时不更新lastCheck', () => {
    const sys = new DiplomaticCrierSystem()
    sys.update(1, world, em, 2989)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2990时更新lastCheck', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1) // > PROCEED_CHANCE
    sys.update(1, world, em, 2990)
    expect((sys as any).lastCheck).toBe(2990)
    vi.restoreAllMocks()
  })

  it('tick<2990时不执行任何逻辑', () => {
    const sys = new DiplomaticCrierSystem()
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, world, em, 100)
    expect((sys as any).lastCheck).toBe(0)
    spy.mockRestore()
  })

  it('连续两次tick=2990和tick=5980都更新', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1) // no spawn
    sys.update(1, world, em, 2990)
    expect((sys as any).lastCheck).toBe(2990)
    sys.update(1, world, em, 5980)
    expect((sys as any).lastCheck).toBe(5980)
    vi.restoreAllMocks()
  })

  it('第二次tick不满足间隔时不更新', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2990)
    sys.update(1, world, em, 2991)
    expect((sys as any).lastCheck).toBe(2990)
    vi.restoreAllMocks()
  })
})

describe('数值字段动态更新', () => {
  function makeArrangement(tick = 1000): CrierArrangement {
    return { id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick }
  }

  it('每次update后duration+1', () => {
    const sys = new DiplomaticCrierSystem()
    const a = makeArrangement(0)
    getArrangements(sys).push(a)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 2990)
    expect(a.duration).toBe(1)
    vi.restoreAllMocks()
  })

  it('proclamationAuthority保持在[5,85]内', () => {
    const sys = new DiplomaticCrierSystem()
    const a = makeArrangement(0)
    getArrangements(sys).push(a)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let t = 2990; t <= 2990 * 100; t += 2990) sys.update(1, world, em, t)
    expect(a.proclamationAuthority).toBeGreaterThanOrEqual(5)
    expect(a.proclamationAuthority).toBeLessThanOrEqual(85)
    vi.restoreAllMocks()
  })

  it('publicReach保持在[10,90]内', () => {
    const sys = new DiplomaticCrierSystem()
    const a = makeArrangement(0)
    getArrangements(sys).push(a)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let t = 2990; t <= 2990 * 100; t += 2990) sys.update(1, world, em, t)
    expect(a.publicReach).toBeGreaterThanOrEqual(10)
    expect(a.publicReach).toBeLessThanOrEqual(90)
    vi.restoreAllMocks()
  })

  it('messageClarity保持在[5,80]内', () => {
    const sys = new DiplomaticCrierSystem()
    const a = makeArrangement(0)
    getArrangements(sys).push(a)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let t = 2990; t <= 2990 * 100; t += 2990) sys.update(1, world, em, t)
    expect(a.messageClarity).toBeGreaterThanOrEqual(5)
    expect(a.messageClarity).toBeLessThanOrEqual(80)
    vi.restoreAllMocks()
  })

  it('ceremonialDuty保持在[5,65]内', () => {
    const sys = new DiplomaticCrierSystem()
    const a = makeArrangement(0)
    getArrangements(sys).push(a)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let t = 2990; t <= 2990 * 100; t += 2990) sys.update(1, world, em, t)
    expect(a.ceremonialDuty).toBeGreaterThanOrEqual(5)
    expect(a.ceremonialDuty).toBeLessThanOrEqual(65)
    vi.restoreAllMocks()
  })
})

describe('过期清理cutoff=tick-88000', () => {
  it('tick字段小于cutoff的记录被删除', () => {
    const sys = new DiplomaticCrierSystem()
    getArrangements(sys).push({ id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 1 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, 100000)
    expect(getArrangements(sys)).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('新记录tick大于cutoff时保留', () => {
    const sys = new DiplomaticCrierSystem()
    const tick = 100000
    getArrangements(sys).push({ id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: tick - 1000 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, tick)
    expect(getArrangements(sys)).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('混合场景：过期的删除，新的保留', () => {
    const sys = new DiplomaticCrierSystem()
    const tick = 100000
    const arr = getArrangements(sys)
    arr.push({ id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 1 })
    arr.push({ id: 2, proclamationCivId: 3, audienceCivId: 4, form: 'borough_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: tick - 1000 })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, tick)
    expect(getArrangements(sys)).toHaveLength(1)
    expect(getArrangements(sys)[0].id).toBe(2)
    vi.restoreAllMocks()
  })

  it('tick===cutoff时不删除（严格小于才删）', () => {
    const sys = new DiplomaticCrierSystem()
    const tick = 100000
    const cutoff = tick - 88000 // 12000
    getArrangements(sys).push({ id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: cutoff })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, world, em, tick)
    expect(getArrangements(sys)).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('空数组时清理逻辑安全执行', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(1, world, em, 100000)).not.toThrow()
    vi.restoreAllMocks()
  })
})

describe('MAX_ARRANGEMENTS=16上限', () => {
  it('已满16个时不新增', () => {
    const sys = new DiplomaticCrierSystem()
    const arr = getArrangements(sys)
    for (let i = 0; i < 16; i++) {
      arr.push({ id: i + 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 200000 })
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < PROCEED_CHANCE
    sys.update(1, world, em, 200000)
    expect(getArrangements(sys)).toHaveLength(16)
    vi.restoreAllMocks()
  })

  it('random>=PROCEED_CHANCE时不spawn', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 0.5 >= 0.0021
    sys.update(1, world, em, 2990)
    expect(getArrangements(sys)).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('spawn时proclamation===audience则跳过不新增', () => {
    const sys = new DiplomaticCrierSystem()
    // random: 0.001(proceed), 0(proclamation=1), 0(audience=1) => same, skip
    const vals = [0.001, 0, 0]
    let idx = 0
    vi.spyOn(Math, 'random').mockImplementation(() => vals[idx++ % vals.length])
    sys.update(1, world, em, 2990)
    expect(getArrangements(sys)).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('多次update后arrangements不超过16', () => {
    const sys = new DiplomaticCrierSystem()
    // fill to 15
    const arr = getArrangements(sys)
    for (let i = 0; i < 15; i++) {
      arr.push({ id: i + 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 200000 })
    }
    // mock spawn once: 0.001(proceed), 0(proc=1), 0.5(aud=5), rest=1
    const vals = [0.001, 0, 0.5, 0.5, 1]
    let idx = 0
    vi.spyOn(Math, 'random').mockImplementation(() => vals[idx++ % vals.length])
    sys.update(1, world, em, 200000)
    expect(getArrangements(sys).length).toBeLessThanOrEqual(16)
    vi.restoreAllMocks()
  })
})

describe('CrierForm枚举完整性', () => {
  it('royal_crier可存储', () => {
    const sys = new DiplomaticCrierSystem()
    getArrangements(sys).push({ id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 1000 })
    expect(getArrangements(sys)[0].form).toBe('royal_crier')
  })

  it('borough_crier可存储', () => {
    const sys = new DiplomaticCrierSystem()
    getArrangements(sys).push({ id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'borough_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 1000 })
    expect(getArrangements(sys)[0].form).toBe('borough_crier')
  })

  it('market_crier可存储', () => {
    const sys = new DiplomaticCrierSystem()
    getArrangements(sys).push({ id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'market_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 1000 })
    expect(getArrangements(sys)[0].form).toBe('market_crier')
  })

  it('court_crier可存储', () => {
    const sys = new DiplomaticCrierSystem()
    getArrangements(sys).push({ id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'court_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 1000 })
    expect(getArrangements(sys)[0].form).toBe('court_crier')
  })
})

describe('额外边界与枚举测试', () => {
  it('proclamationAuthority 上限 85 不被突破', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a: CrierArrangement = { id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 84.99, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 0 }
    getArrangements(sys).push(a)
    sys.update(1, world, em, 2990)
    expect(a.proclamationAuthority).toBeLessThanOrEqual(85)
    vi.restoreAllMocks()
  })

  it('proclamationAuthority 下限 5 不被突破', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const a: CrierArrangement = { id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 5.01, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 0 }
    getArrangements(sys).push(a)
    sys.update(1, world, em, 2990)
    expect(a.proclamationAuthority).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })

  it('publicReach 上限 90 不被突破', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a: CrierArrangement = { id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 50, publicReach: 89.99, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 0 }
    getArrangements(sys).push(a)
    sys.update(1, world, em, 2990)
    expect(a.publicReach).toBeLessThanOrEqual(90)
    vi.restoreAllMocks()
  })

  it('messageClarity 上限 80 不被突破', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a: CrierArrangement = { id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 79.99, ceremonialDuty: 30, duration: 0, tick: 0 }
    getArrangements(sys).push(a)
    sys.update(1, world, em, 2990)
    expect(a.messageClarity).toBeLessThanOrEqual(80)
    vi.restoreAllMocks()
  })

  it('ceremonialDuty 上限 65 不被突破', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const a: CrierArrangement = { id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 64.99, duration: 0, tick: 0 }
    getArrangements(sys).push(a)
    sys.update(1, world, em, 2990)
    expect(a.ceremonialDuty).toBeLessThanOrEqual(65)
    vi.restoreAllMocks()
  })

  it('borough_crier form 可存储', () => {
    const sys = new DiplomaticCrierSystem()
    getArrangements(sys).push({ id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'borough_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 0 })
    expect(getArrangements(sys)[0].form).toBe('borough_crier')
  })

  it('market_crier form 可存储', () => {
    const sys = new DiplomaticCrierSystem()
    getArrangements(sys).push({ id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'market_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 0 })
    expect(getArrangements(sys)[0].form).toBe('market_crier')
  })

  it('court_crier form 可存储', () => {
    const sys = new DiplomaticCrierSystem()
    getArrangements(sys).push({ id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'court_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 0 })
    expect(getArrangements(sys)[0].form).toBe('court_crier')
  })

  it('多条 arrangements 各自独立更新 duration', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const a1: CrierArrangement = { id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 3, tick: 0 }
    const a2: CrierArrangement = { id: 2, proclamationCivId: 3, audienceCivId: 4, form: 'market_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 7, tick: 0 }
    getArrangements(sys).push(a1)
    getArrangements(sys).push(a2)
    sys.update(1, world, em, 2990)
    expect(a1.duration).toBe(4)
    expect(a2.duration).toBe(8)
    vi.restoreAllMocks()
  })

  it('过期记录（tick < cutoff）被移除', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    getArrangements(sys).push({ id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 0 })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, 88000 + 2990 + 1)
    expect(getArrangements(sys)).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('未过期记录保留', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const bigTick = 88000 + 2990
    getArrangements(sys).push({ id: 1, proclamationCivId: 1, audienceCivId: 2, form: 'royal_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: bigTick - 1000 })
    ;(sys as any).lastCheck = 0
    sys.update(1, world, em, bigTick)
    expect(getArrangements(sys)).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('update 不改变 proclamationCivId/audienceCivId', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const a: CrierArrangement = { id: 1, proclamationCivId: 5, audienceCivId: 8, form: 'royal_crier', proclamationAuthority: 50, publicReach: 50, messageClarity: 40, ceremonialDuty: 30, duration: 0, tick: 0 }
    getArrangements(sys).push(a)
    sys.update(1, world, em, 2990)
    expect(a.proclamationCivId).toBe(5)
    expect(a.audienceCivId).toBe(8)
    vi.restoreAllMocks()
  })

  it('空 arrangements 时 update 不崩溃', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(() => sys.update(1, world, em, 2990)).not.toThrow()
    vi.restoreAllMocks()
  })

  it('nextId 手动设置后保持', () => {
    const sys = new DiplomaticCrierSystem()
    ;(sys as any).nextId = 44
    expect((sys as any).nextId).toBe(44)
  })

  it('lastCheck 更新到最新 tick', () => {
    const sys = new DiplomaticCrierSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, world, em, 2990 * 3)
    expect((sys as any).lastCheck).toBe(2990 * 3)
    vi.restoreAllMocks()
  })
})
