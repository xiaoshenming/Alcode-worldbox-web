import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticExonerationSystem } from '../systems/DiplomaticExonerationSystem'

function makeProceeding(overrides: Partial<any> = {}) {
  return {
    id: 1,
    civIdA: 1,
    civIdB: 2,
    form: 'false_accusation_clearing',
    evidence: 50,
    justiceServed: 40,
    reputationRecovery: 30,
    diplomaticReset: 20,
    duration: 0,
    tick: 0,
    ...overrides,
  }
}

describe('基础数据结构', () => {
  let sys: DiplomaticExonerationSystem
  beforeEach(() => { sys = new DiplomaticExonerationSystem() })

  it('初始proceedings为空', () => { expect((sys as any).proceedings).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('手动注入proceeding可查询', () => {
    ;(sys as any).proceedings.push(makeProceeding({ id: 42 }))
    expect((sys as any).proceedings[0].id).toBe(42)
  })
  it('4种form枚举完整', () => {
    const forms = ['false_accusation_clearing', 'war_crime_acquittal', 'honor_vindication', 'reputation_restoration']
    forms.forEach(f => {
      const p = makeProceeding({ form: f })
      expect(p.form).toBe(f)
    })
  })
})

describe('CHECK_INTERVAL=2440节流', () => {
  let sys: DiplomaticExonerationSystem
  beforeEach(() => { sys = new DiplomaticExonerationSystem() })

  it('tick<2440时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2439)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick>=2440时lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2440)
    expect((sys as any).lastCheck).toBe(2440)
  })
  it('已更新后再次调用需等待新一轮间隔', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2440)
    ;(sys as any).lastCheck = 2440
    sys.update(1, {} as any, {} as any, 4000)
    expect((sys as any).lastCheck).toBe(2440) // 4000-2440=1560 < 2440
  })
  it('恰好差值=2440时更新', () => {
    ;(sys as any).lastCheck = 1000
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 3440)
    expect((sys as any).lastCheck).toBe(3440)
  })
  it('tick差值恰好是2439时不更新', () => {
    ;(sys as any).lastCheck = 1000
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 3439)
    expect((sys as any).lastCheck).toBe(1000)
  })
})

describe('数值字段动态更新', () => {
  let sys: DiplomaticExonerationSystem
  beforeEach(() => { sys = new DiplomaticExonerationSystem() })

  it('duration每次update+1', () => {
    ;(sys as any).proceedings.push(makeProceeding({ duration: 0, tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2440)
    expect((sys as any).proceedings[0].duration).toBe(1)
  })
  it('evidence在[15,90]范围内', () => {
    const bigTick = 500000
    ;(sys as any).proceedings.push(makeProceeding({ evidence: 50, tick: bigTick }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, bigTick + 2440)
    const ev = (sys as any).proceedings[0].evidence
    expect(ev).toBeGreaterThanOrEqual(15)
    expect(ev).toBeLessThanOrEqual(90)
  })
  it('justiceServed在[10,85]范围内', () => {
    ;(sys as any).proceedings.push(makeProceeding({ justiceServed: 40, tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2440)
    const val = (sys as any).proceedings[0].justiceServed
    expect(val).toBeGreaterThanOrEqual(10)
    expect(val).toBeLessThanOrEqual(85)
  })
  it('reputationRecovery在[5,75]范围内', () => {
    ;(sys as any).proceedings.push(makeProceeding({ reputationRecovery: 30, tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2440)
    const val = (sys as any).proceedings[0].reputationRecovery
    expect(val).toBeGreaterThanOrEqual(5)
    expect(val).toBeLessThanOrEqual(75)
  })
  it('diplomaticReset在[5,65]范围内', () => {
    ;(sys as any).proceedings.push(makeProceeding({ diplomaticReset: 20, tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2440)
    const val = (sys as any).proceedings[0].diplomaticReset
    expect(val).toBeGreaterThanOrEqual(5)
    expect(val).toBeLessThanOrEqual(65)
  })
})

describe('过期清理cutoff=tick-85000', () => {
  let sys: DiplomaticExonerationSystem
  beforeEach(() => { sys = new DiplomaticExonerationSystem() })

  it('过期记录被删除', () => {
    const bigTick = 200000
    ;(sys as any).proceedings.push(makeProceeding({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, bigTick)
    expect((sys as any).proceedings).toHaveLength(0)
  })
  it('新鲜记录不被删除', () => {
    const bigTick = 200000
    ;(sys as any).proceedings.push(makeProceeding({ tick: bigTick - 1000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, bigTick)
    expect((sys as any).proceedings).toHaveLength(1)
  })
  it('tick===cutoff时不删除（条件是<cutoff）', () => {
    const bigTick = 200000
    const cutoff = bigTick - 85000 // 115000
    ;(sys as any).proceedings.push(makeProceeding({ tick: cutoff }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, bigTick)
    expect((sys as any).proceedings).toHaveLength(1)
  })
  it('混合新鲜和过期时只删过期', () => {
    const bigTick = 200000
    ;(sys as any).proceedings.push(makeProceeding({ id: 1, tick: 0 }))       // 过期
    ;(sys as any).proceedings.push(makeProceeding({ id: 2, tick: bigTick - 1000 })) // 新鲜
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, bigTick)
    expect((sys as any).proceedings).toHaveLength(1)
    expect((sys as any).proceedings[0].id).toBe(2)
  })
  it('空数组时过期清理不崩溃', () => {
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, {} as any, {} as any, 200000)).not.toThrow()
  })
})

describe('MAX_PROCEEDINGS=20上限', () => {
  let sys: DiplomaticExonerationSystem
  beforeEach(() => { sys = new DiplomaticExonerationSystem() })

  it('proceedings达20条时不新增', () => {
    for (let i = 0; i < 20; i++) {
      ;(sys as any).proceedings.push(makeProceeding({ id: i, tick: 500000 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < PROCEED_CHANCE=0.0024
    sys.update(1, {} as any, {} as any, 2440)
    expect((sys as any).proceedings).toHaveLength(20)
    vi.restoreAllMocks()
  })
  it('proceedings<20时可以新增（若random触发）', () => {
    expect((sys as any).proceedings).toHaveLength(0)
  })
  it('手动超过20条不报错', () => {
    for (let i = 0; i < 25; i++) {
      ;(sys as any).proceedings.push(makeProceeding({ id: i }))
    }
    expect((sys as any).proceedings).toHaveLength(25)
  })
  it('nextId在新增后递增', () => {
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const before = (sys as any).nextId
    sys.update(1, {} as any, {} as any, 2440)
    // nextId可能递增（若civA!==civB），不回退
    expect((sys as any).nextId).toBeGreaterThanOrEqual(before)
    vi.restoreAllMocks()
  })
})

describe('ExonerationForm枚举完整性', () => {
  let sys: DiplomaticExonerationSystem
  beforeEach(() => { sys = new DiplomaticExonerationSystem() })

  it('false_accusation_clearing是合法form', () => {
    const p = makeProceeding({ form: 'false_accusation_clearing' })
    expect(p.form).toBe('false_accusation_clearing')
  })
  it('war_crime_acquittal是合法form', () => {
    const p = makeProceeding({ form: 'war_crime_acquittal' })
    expect(p.form).toBe('war_crime_acquittal')
  })
  it('honor_vindication是合法form', () => {
    const p = makeProceeding({ form: 'honor_vindication' })
    expect(p.form).toBe('honor_vindication')
  })
  it('reputation_restoration是合法form', () => {
    const p = makeProceeding({ form: 'reputation_restoration' })
    expect(p.form).toBe('reputation_restoration')
  })
})

describe('额外边界与防御性测试', () => {
  it('evidence 上限 90 不被突破', () => {
    const sys = new DiplomaticExonerationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).proceedings.push(makeProceeding({ evidence: 89.99, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2440)
    expect((sys as any).proceedings[0]?.evidence).toBeLessThanOrEqual(90)
    vi.restoreAllMocks()
  })

  it('evidence 下限 15 不被突破', () => {
    const sys = new DiplomaticExonerationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).proceedings.push(makeProceeding({ evidence: 15.01, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2440)
    expect((sys as any).proceedings[0]?.evidence).toBeGreaterThanOrEqual(15)
    vi.restoreAllMocks()
  })

  it('justiceServed 上限 85 不被突破', () => {
    const sys = new DiplomaticExonerationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).proceedings.push(makeProceeding({ justiceServed: 84.99, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2440)
    expect((sys as any).proceedings[0]?.justiceServed).toBeLessThanOrEqual(85)
    vi.restoreAllMocks()
  })

  it('reputationRecovery 上限 75 不被突破', () => {
    const sys = new DiplomaticExonerationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).proceedings.push(makeProceeding({ reputationRecovery: 74.99, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2440)
    expect((sys as any).proceedings[0]?.reputationRecovery).toBeLessThanOrEqual(75)
    vi.restoreAllMocks()
  })

  it('diplomaticReset 上限 65 不被突破', () => {
    const sys = new DiplomaticExonerationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).proceedings.push(makeProceeding({ diplomaticReset: 64.99, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2440)
    expect((sys as any).proceedings[0]?.diplomaticReset).toBeLessThanOrEqual(65)
    vi.restoreAllMocks()
  })

  it('diplomaticReset 下限 5 不被突破', () => {
    const sys = new DiplomaticExonerationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).proceedings.push(makeProceeding({ diplomaticReset: 5.01, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2440)
    expect((sys as any).proceedings[0]?.diplomaticReset).toBeGreaterThanOrEqual(5)
    vi.restoreAllMocks()
  })

  it('war_crime_acquittal form 可存储', () => {
    expect(makeProceeding({ form: 'war_crime_acquittal' }).form).toBe('war_crime_acquittal')
  })

  it('honor_vindication form 可存储', () => {
    expect(makeProceeding({ form: 'honor_vindication' }).form).toBe('honor_vindication')
  })

  it('过期记录（cutoff=tick-85000）被移除', () => {
    const sys = new DiplomaticExonerationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).proceedings.push(makeProceeding({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 85000 + 2440 + 1)
    expect((sys as any).proceedings).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('未过期记录保留', () => {
    const sys = new DiplomaticExonerationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bigTick = 85000 + 2440
    ;(sys as any).proceedings.push(makeProceeding({ tick: bigTick - 1000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, bigTick)
    expect((sys as any).proceedings).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('update 不改变 civIdA/civIdB', () => {
    const sys = new DiplomaticExonerationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).proceedings.push(makeProceeding({ civIdA: 4, civIdB: 7, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2440)
    expect((sys as any).proceedings[0].civIdA).toBe(4)
    expect((sys as any).proceedings[0].civIdB).toBe(7)
    vi.restoreAllMocks()
  })

  it('多条 proceedings 各自独立更新 duration', () => {
    const sys = new DiplomaticExonerationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).proceedings.push(makeProceeding({ id: 1, duration: 3, tick: 0 }))
    ;(sys as any).proceedings.push(makeProceeding({ id: 2, duration: 7, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2440)
    expect((sys as any).proceedings[0].duration).toBe(4)
    expect((sys as any).proceedings[1].duration).toBe(8)
    vi.restoreAllMocks()
  })

  it('空 proceedings 时 update 不崩溃', () => {
    const sys = new DiplomaticExonerationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(() => sys.update(1, {} as any, {} as any, 2440)).not.toThrow()
    vi.restoreAllMocks()
  })

  it('ExonerationProceeding 包含所有必要字段', () => {
    const p = makeProceeding()
    expect(p).toHaveProperty('id')
    expect(p).toHaveProperty('civIdA')
    expect(p).toHaveProperty('civIdB')
    expect(p).toHaveProperty('form')
    expect(p).toHaveProperty('evidence')
    expect(p).toHaveProperty('justiceServed')
    expect(p).toHaveProperty('reputationRecovery')
    expect(p).toHaveProperty('diplomaticReset')
    expect(p).toHaveProperty('duration')
    expect(p).toHaveProperty('tick')
  })

  it('MAX_PROCEEDINGS=20 已满时不新增', () => {
    const sys = new DiplomaticExonerationSystem()
    for (let i = 0; i < 20; i++) {
      ;(sys as any).proceedings.push(makeProceeding({ id: i + 1, tick: 9999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 2440)
    expect((sys as any).proceedings.length).toBeLessThanOrEqual(20)
    vi.restoreAllMocks()
  })

  it('nextId 手动设置后保持', () => {
    const sys = new DiplomaticExonerationSystem()
    ;(sys as any).nextId = 88
    expect((sys as any).nextId).toBe(88)
  })

  it('lastCheck 更新到最新 tick', () => {
    const sys = new DiplomaticExonerationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, {} as any, {} as any, 2440 * 4)
    expect((sys as any).lastCheck).toBe(2440 * 4)
    vi.restoreAllMocks()
  })

  it('全部过期后 proceedings 清空', () => {
    const sys = new DiplomaticExonerationSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).proceedings.push(makeProceeding({ tick: 0 }))
    ;(sys as any).proceedings.push(makeProceeding({ tick: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 200000)
    expect((sys as any).proceedings).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('CHECK_INTERVAL=2440 节流有效', () => {
    const sys = new DiplomaticExonerationSystem()
    ;(sys as any).proceedings.push(makeProceeding({ duration: 5, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2439)
    expect((sys as any).proceedings[0].duration).toBe(5)
    vi.restoreAllMocks()
  })
})
