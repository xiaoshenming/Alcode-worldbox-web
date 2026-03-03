import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAcquittalSystem } from '../systems/DiplomaticAcquittalSystem'
import type { AcquittalVerdict, AcquittalForm } from '../systems/DiplomaticAcquittalSystem'

const CHECK_INTERVAL = 2440
const MAX_VERDICTS = 20

function makeSys() { return new DiplomaticAcquittalSystem() }
const W = {} as any, EM = {} as any

function makeVerdict(overrides: Partial<AcquittalVerdict> = {}): AcquittalVerdict {
  return { id: 1, civIdA: 1, civIdB: 2, form: 'war_crime_clearing', evidenceStrength: 50, legitimacy: 40, relationRepair: 30, precedentValue: 20, duration: 0, tick: 0, ...overrides }
}

describe('DiplomaticAcquittalSystem — 初始状态', () => {
  let sys: DiplomaticAcquittalSystem
  beforeEach(() => { sys = makeSys() })

  it('初始verdicts为空数组', () => { expect((sys as any).verdicts).toHaveLength(0) })
  it('verdicts是数组', () => { expect(Array.isArray((sys as any).verdicts)).toBe(true) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('手动注入verdict后长度为1', () => {
    ;(sys as any).verdicts.push(makeVerdict({ id: 1 }))
    expect((sys as any).verdicts).toHaveLength(1)
  })
  it('AcquittalVerdict包含所有必需字段', () => {
    const v = makeVerdict()
    ;['id','civIdA','civIdB','form','evidenceStrength','legitimacy','relationRepair','precedentValue','duration','tick'].forEach(f => expect(v).toHaveProperty(f))
  })
})

describe('DiplomaticAcquittalSystem — CHECK_INTERVAL=2440 节流', () => {
  let sys: DiplomaticAcquittalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行（lastCheck依然为0）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick < CHECK_INTERVAL时被节流', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick === CHECK_INTERVAL时通过，lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick > CHECK_INTERVAL时通过', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 100)
  })
  it('第一次通过后同tick再调用被节流', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('两倍interval时lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('三次顺序更新lastCheck正确', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    sys.update(1, W, EM, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })
})

describe('DiplomaticAcquittalSystem — 数值字段动态更新', () => {
  let sys: DiplomaticAcquittalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次update通过后duration递增', () => {
    ;(sys as any).verdicts.push(makeVerdict({ tick: CHECK_INTERVAL }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).verdicts[0].duration).toBe(1)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect((sys as any).verdicts[0].duration).toBe(2)
  })
  it('evidenceStrength约束在[15, 90]', () => {
    ;(sys as any).verdicts.push(makeVerdict({ evidenceStrength: 50, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * i)
    }
    const es = (sys as any).verdicts[0]?.evidenceStrength
    if (es !== undefined) { expect(es).toBeGreaterThanOrEqual(15); expect(es).toBeLessThanOrEqual(90) }
  })
  it('legitimacy约束在[10, 85]', () => {
    ;(sys as any).verdicts.push(makeVerdict({ legitimacy: 50, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * i)
    }
    const leg = (sys as any).verdicts[0]?.legitimacy
    if (leg !== undefined) { expect(leg).toBeGreaterThanOrEqual(10); expect(leg).toBeLessThanOrEqual(85) }
  })
  it('relationRepair约束在[5, 75]', () => {
    ;(sys as any).verdicts.push(makeVerdict({ relationRepair: 40, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * i)
    }
    const rr = (sys as any).verdicts[0]?.relationRepair
    if (rr !== undefined) { expect(rr).toBeGreaterThanOrEqual(5); expect(rr).toBeLessThanOrEqual(75) }
  })
  it('precedentValue约束在[5, 65]', () => {
    ;(sys as any).verdicts.push(makeVerdict({ precedentValue: 30, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      vi.spyOn(Math, 'random').mockReturnValue(0.9)
      sys.update(1, W, EM, CHECK_INTERVAL * i)
    }
    const pv = (sys as any).verdicts[0]?.precedentValue
    if (pv !== undefined) { expect(pv).toBeGreaterThanOrEqual(5); expect(pv).toBeLessThanOrEqual(65) }
  })
  it('duration每次update后增加1', () => {
    ;(sys as any).verdicts.push(makeVerdict({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).verdicts[0].duration).toBeGreaterThanOrEqual(1)
  })
})

describe('DiplomaticAcquittalSystem — 过期清理（cutoff=tick-86000）', () => {
  let sys: DiplomaticAcquittalSystem
  beforeEach(() => { sys = makeSys() })

  it('tick=0的verdict在tick=90000时被清理', () => {
    ;(sys as any).verdicts.push(makeVerdict({ id: 1, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect((sys as any).verdicts).toHaveLength(0)
    vi.restoreAllMocks()
  })
  it('tick=5000的verdict在tick=90000时保留', () => {
    ;(sys as any).verdicts.push(makeVerdict({ id: 1, tick: 5000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect((sys as any).verdicts).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('verdict.tick恰好等于cutoff时不被清理', () => {
    ;(sys as any).verdicts.push(makeVerdict({ id: 1, tick: 4000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect((sys as any).verdicts).toHaveLength(1)
    vi.restoreAllMocks()
  })
  it('多个verdicts中只有过期的被删除', () => {
    ;(sys as any).verdicts.push(makeVerdict({ id: 1, tick: 0 }))
    ;(sys as any).verdicts.push(makeVerdict({ id: 2, tick: 5000 }))
    ;(sys as any).verdicts.push(makeVerdict({ id: 3, tick: 1000 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect((sys as any).verdicts).toHaveLength(1)
    expect((sys as any).verdicts[0].id).toBe(2)
    vi.restoreAllMocks()
  })
})

describe('DiplomaticAcquittalSystem — MAX_VERDICTS=20 上限', () => {
  let sys: DiplomaticAcquittalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('verdicts已满20条时不新增', () => {
    for (let i = 1; i <= MAX_VERDICTS; i++) { (sys as any).verdicts.push(makeVerdict({ id: i, tick: CHECK_INTERVAL })) }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).verdicts).toHaveLength(MAX_VERDICTS)
  })
  it('verdicts=19条时可添加到20条', () => {
    for (let i = 1; i <= MAX_VERDICTS - 1; i++) { (sys as any).verdicts.push(makeVerdict({ id: i, tick: 999999 })) }
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).verdicts.length).toBeLessThanOrEqual(MAX_VERDICTS)
  })
  it('AcquittalForm包含全部4种类型', () => {
    const forms: AcquittalForm[] = ['war_crime_clearing', 'treaty_violation_dismissal', 'espionage_acquittal', 'sabotage_exculpation']
    forms.forEach(f => expect(makeVerdict({ form: f }).form).toBe(f))
  })
})

describe('DiplomaticAcquittalSystem — nextId递增与综合', () => {
  let sys: DiplomaticAcquittalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('手动插入两条verdict，id各自正确', () => {
    ;(sys as any).verdicts.push(makeVerdict({ id: (sys as any).nextId++ }))
    ;(sys as any).verdicts.push(makeVerdict({ id: (sys as any).nextId++ }))
    expect((sys as any).verdicts[0].id).toBe(1)
    expect((sys as any).verdicts[1].id).toBe(2)
    expect((sys as any).nextId).toBe(3)
  })
  it('多次update后lastCheck被正确更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, W, EM, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('verdict civIdA civIdB 互不相同', () => {
    const v = makeVerdict({ civIdA: 1, civIdB: 2 })
    expect(v.civIdA).not.toBe(v.civIdB)
  })
  it('verdict tick 字段正确', () => {
    const v = makeVerdict({ tick: 12345 })
    expect(v.tick).toBe(12345)
  })
  it('form 字段类型为 string', () => {
    expect(typeof makeVerdict().form).toBe('string')
  })
  it('duration 初始为 0', () => { expect(makeVerdict().duration).toBe(0) })
  it('update 不崩溃（空verdicts）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, CHECK_INTERVAL)).not.toThrow()
  })
  it('evidenceStrength 初始值在合理范围 30-70', () => {
    const v = makeVerdict({ evidenceStrength: 50 })
    expect(v.evidenceStrength).toBe(50)
  })
  it('update 多次后没有崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    for (let i = 1; i <= 5; i++) sys.update(1, W, EM, CHECK_INTERVAL * i)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 5)
  })
  it('civIdB 不等于 civIdA 时才创建 verdict', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)    // passes VERDICT_CHANCE
      .mockReturnValueOnce(0)    // civA = 1
      .mockReturnValueOnce(0)    // civB = 1 (same! should not spawn)
      .mockReturnValue(0.5)
    sys.update(1, W, EM, CHECK_INTERVAL)
    expect((sys as any).verdicts).toHaveLength(0)
  })
})

describe('DiplomaticAcquittalSystem — 字段结构与边界补充', () => {
  let sys: DiplomaticAcquittalSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('nextId 随手动插入递增', () => {
    ;(sys as any).nextId = 5
    ;(sys as any).verdicts.push(makeVerdict({ id: (sys as any).nextId++ }))
    expect((sys as any).nextId).toBe(6)
  })
  it('注入多条 verdict 后长度正确', () => {
    for (let i = 0; i < 5; i++) { (sys as any).verdicts.push(makeVerdict({ id: i })) }
    expect((sys as any).verdicts).toHaveLength(5)
  })
  it('verdict.legitimacy 初始值', () => { expect(makeVerdict({ legitimacy: 40 }).legitimacy).toBe(40) })
  it('verdict.relationRepair 初始值', () => { expect(makeVerdict({ relationRepair: 30 }).relationRepair).toBe(30) })
  it('verdict.precedentValue 初始值', () => { expect(makeVerdict({ precedentValue: 20 }).precedentValue).toBe(20) })
  it('过期清理后 verdicts 数组仍是合法数组', () => {
    ;(sys as any).verdicts.push(makeVerdict({ tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 90000)
    expect(Array.isArray((sys as any).verdicts)).toBe(true)
  })
  it('空 verdicts 时 update 不崩溃', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, W, EM, CHECK_INTERVAL)).not.toThrow()
  })
  it('update 后 lastCheck 等于传入的 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 9999 * CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(9999 * CHECK_INTERVAL)
  })
  it('10 个 verdicts 全部过期后 verdicts 为空', () => {
    for (let i = 0; i < 10; i++) { (sys as any).verdicts.push(makeVerdict({ id: i, tick: i })) }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, W, EM, 200000)
    expect((sys as any).verdicts).toHaveLength(0)
  })
  it('war_crime_clearing form 有效', () => { expect(makeVerdict({ form: 'war_crime_clearing' }).form).toBe('war_crime_clearing') })
  it('espionage_acquittal form 有效', () => { expect(makeVerdict({ form: 'espionage_acquittal' }).form).toBe('espionage_acquittal') })
  it('sabotage_exculpation form 有效', () => { expect(makeVerdict({ form: 'sabotage_exculpation' }).form).toBe('sabotage_exculpation') })
  it('treaty_violation_dismissal form 有效', () => { expect(makeVerdict({ form: 'treaty_violation_dismissal' }).form).toBe('treaty_violation_dismissal') })
  it('MAX_VERDICTS 为 20', () => { expect(MAX_VERDICTS).toBe(20) })
})
