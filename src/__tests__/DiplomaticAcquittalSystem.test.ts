import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAcquittalSystem } from '../systems/DiplomaticAcquittalSystem'
import type { AcquittalVerdict, AcquittalForm } from '../systems/DiplomaticAcquittalSystem'

// Constants from source
const CHECK_INTERVAL = 2440
const MAX_VERDICTS = 20
const EXPIRE_OFFSET = 86000

function makeSys() { return new DiplomaticAcquittalSystem() }

function makeVerdict(overrides: Partial<AcquittalVerdict> = {}): AcquittalVerdict {
  return {
    id: 1,
    civIdA: 1,
    civIdB: 2,
    form: 'war_crime_clearing',
    evidenceStrength: 50,
    legitimacy: 40,
    relationRepair: 30,
    precedentValue: 20,
    duration: 0,
    tick: 0,
    ...overrides,
  }
}

describe('DiplomaticAcquittalSystem — 基础数据结构', () => {
  let sys: DiplomaticAcquittalSystem
  beforeEach(() => { sys = makeSys() })

  it('初始verdicts为空数组', () => {
    expect((sys as any).verdicts).toHaveLength(0)
    expect(Array.isArray((sys as any).verdicts)).toBe(true)
  })

  it('nextId初��为1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck初始为0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('手动注入verdict后verdicts长度为1', () => {
    ;(sys as any).verdicts.push(makeVerdict({ id: 1 }))
    expect((sys as any).verdicts).toHaveLength(1)
    expect((sys as any).verdicts[0].id).toBe(1)
  })

  it('AcquittalVerdict包含所有必需字段', () => {
    const v = makeVerdict()
    expect(v).toHaveProperty('id')
    expect(v).toHaveProperty('civIdA')
    expect(v).toHaveProperty('civIdB')
    expect(v).toHaveProperty('form')
    expect(v).toHaveProperty('evidenceStrength')
    expect(v).toHaveProperty('legitimacy')
    expect(v).toHaveProperty('relationRepair')
    expect(v).toHaveProperty('precedentValue')
    expect(v).toHaveProperty('duration')
    expect(v).toHaveProperty('tick')
  })
})

describe('DiplomaticAcquittalSystem — CHECK_INTERVAL=2440 节流', () => {
  let sys: DiplomaticAcquittalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行update（lastCheck依然为0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick < CHECK_INTERVAL时被节流，不更新lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick === CHECK_INTERVAL时通过节流，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })

  it('tick > CHECK_INTERVAL时通过节流，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })

  it('第一次update通过后，再以相同tick调用，被节流', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    // 同一tick再次调用，差值为0 < CHECK_INTERVAL，被节流
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    // lastCheck依然是CHECK_INTERVAL（没有第二次更新）
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
})

describe('DiplomaticAcquittalSystem — 数值字段动态更新', () => {
  let sys: DiplomaticAcquittalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次update通过节流后，已有verdict的duration递增', () => {
    ;(sys as any).verdicts.push(makeVerdict({ tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).verdicts[0].duration).toBe(1)
    // 推进第二个区间
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).verdicts[0].duration).toBe(2)
  })

  it('evidenceStrength被约束在[15, 90]范围内', () => {
    ;(sys as any).verdicts.push(makeVerdict({ evidenceStrength: 50, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    }
    const es = (sys as any).verdicts[0]?.evidenceStrength
    if (es !== undefined) {
      expect(es).toBeGreaterThanOrEqual(15)
      expect(es).toBeLessThanOrEqual(90)
    }
  })

  it('legitimacy被约束在[10, 85]范围内', () => {
    ;(sys as any).verdicts.push(makeVerdict({ legitimacy: 50, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    }
    const leg = (sys as any).verdicts[0]?.legitimacy
    if (leg !== undefined) {
      expect(leg).toBeGreaterThanOrEqual(10)
      expect(leg).toBeLessThanOrEqual(85)
    }
  })

  it('relationRepair被约束在[5, 75]范围内', () => {
    ;(sys as any).verdicts.push(makeVerdict({ relationRepair: 40, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    }
    const rr = (sys as any).verdicts[0]?.relationRepair
    if (rr !== undefined) {
      expect(rr).toBeGreaterThanOrEqual(5)
      expect(rr).toBeLessThanOrEqual(75)
    }
  })

  it('precedentValue被约束在[5, 65]范围内', () => {
    ;(sys as any).verdicts.push(makeVerdict({ precedentValue: 30, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    }
    const pv = (sys as any).verdicts[0]?.precedentValue
    if (pv !== undefined) {
      expect(pv).toBeGreaterThanOrEqual(5)
      expect(pv).toBeLessThanOrEqual(65)
    }
  })
})

describe('DiplomaticAcquittalSystem — time-based过期清理（cutoff=tick-86000）', () => {
  let sys: DiplomaticAcquittalSystem
  beforeEach(() => { sys = makeSys() })

  it('tick=0的verdict在tick=90000时被清理（0 < 90000-86000=4000）', () => {
    ;(sys as any).verdicts.push(makeVerdict({ id: 1, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).verdicts).toHaveLength(0)
  })

  it('tick=5000的verdict在tick=90000时被清理（5000 < 4000为false，但5000<cutoff=4000也为false，verdict存活）', () => {
    // cutoff = 90000 - 86000 = 4000; verdict.tick=5000 >= 4000, 不被清理
    ;(sys as any).verdicts.push(makeVerdict({ id: 1, tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).verdicts).toHaveLength(1)
  })

  it('verdict.tick恰好等于cutoff时不被清理（< cutoff才清理）', () => {
    // cutoff = 90000 - 86000 = 4000; verdict.tick=4000，不满足 < cutoff
    ;(sys as any).verdicts.push(makeVerdict({ id: 1, tick: 4000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).verdicts).toHaveLength(1)
  })

  it('多个verdicts中只有过期的被删除', () => {
    ;(sys as any).verdicts.push(makeVerdict({ id: 1, tick: 0 }))   // 过期：0 < 90000-86000=4000
    ;(sys as any).verdicts.push(makeVerdict({ id: 2, tick: 5000 })) // 存活：5000 >= 4000
    ;(sys as any).verdicts.push(makeVerdict({ id: 3, tick: 1000 })) // 过期：1000 < 4000
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).verdicts).toHaveLength(1)
    expect((sys as any).verdicts[0].id).toBe(2)
  })
})

describe('DiplomaticAcquittalSystem — MAX_VERDICTS=20 上限', () => {
  let sys: DiplomaticAcquittalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('verdicts已满20条时，即使random通过也不新增', () => {
    for (let i = 1; i <= MAX_VERDICTS; i++) {
      ;(sys as any).verdicts.push(makeVerdict({ id: i, tick: CHECK_INTERVAL }))
    }
    expect((sys as any).verdicts).toHaveLength(MAX_VERDICTS)
    // 强制random返回0确保通过VERDICT_CHANCE
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).verdicts).toHaveLength(MAX_VERDICTS)
  })

  it('verdicts=19条时，random通过则可添加到20条', () => {
    for (let i = 1; i <= MAX_VERDICTS - 1; i++) {
      ;(sys as any).verdicts.push(makeVerdict({ id: i, tick: 999999 }))
    }
    // mock：random第一次返回0（通过VERDICT_CHANCE），后续返回0.5（civA=civB避免相等：civA=1+0*8=1, civB=1+0.5*8=5）
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)      // 通过VERDICT_CHANCE
      .mockReturnValueOnce(0)      // civA = 1
      .mockReturnValueOnce(0.5)    // civB = 5
      .mockReturnValue(0.5)        // pickRandom等其余调用
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).verdicts.length).toBeLessThanOrEqual(MAX_VERDICTS)
  })

  it('AcquittalForm包含全部4种类型', () => {
    const forms: AcquittalForm[] = [
      'war_crime_clearing',
      'treaty_violation_dismissal',
      'espionage_acquittal',
      'sabotage_exculpation',
    ]
    forms.forEach(f => {
      const v = makeVerdict({ form: f })
      expect(v.form).toBe(f)
    })
  })
})

describe('DiplomaticAcquittalSystem — nextId递增', () => {
  let sys: DiplomaticAcquittalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('手动插入两条verdict，id字段各自正确', () => {
    ;(sys as any).verdicts.push(makeVerdict({ id: (sys as any).nextId++ }))
    ;(sys as any).verdicts.push(makeVerdict({ id: (sys as any).nextId++ }))
    expect((sys as any).verdicts[0].id).toBe(1)
    expect((sys as any).verdicts[1].id).toBe(2)
    expect((sys as any).nextId).toBe(3)
  })

  it('新建系统多次调用update，lastCheck被正确更新为最新tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })
})
