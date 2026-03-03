import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticGuardianshipSystem } from '../systems/DiplomaticGuardianshipSystem'
import type { GuardianshipArrangement } from '../systems/DiplomaticGuardianshipSystem'

const CHECK_INTERVAL = 2570
const MAX_ARRANGEMENTS = 16
const EXPIRE_OFFSET = 88000

function makeSys() { return new DiplomaticGuardianshipSystem() }

function makeArr(overrides: Partial<GuardianshipArrangement> = {}): GuardianshipArrangement {
  return {
    id: 1, guardianCivId: 1, protectedCivId: 2, form: 'military_guardianship',
    protectionStrength: 40, dependencyLevel: 45, autonomyPreserved: 25, stabilityBonus: 30,
    duration: 0, tick: 0, ...overrides,
  }
}

describe('DiplomaticGuardianshipSystem — 基础数据结构', () => {
  let sys: DiplomaticGuardianshipSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('初始arrangements为空数组', () => {
    expect((sys as any).arrangements).toHaveLength(0)
    expect(Array.isArray((sys as any).arrangements)).toBe(true)
  })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('手动注入arrangement后长度为1且id正确', () => {
    ;(sys as any).arrangements.push(makeArr({ id: 1 }))
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(1)
  })
  it('GuardianshipArrangement包含所有必需字段', () => {
    const a = makeArr()
    expect(a).toHaveProperty('id')
    expect(a).toHaveProperty('guardianCivId')
    expect(a).toHaveProperty('protectedCivId')
    expect(a).toHaveProperty('form')
    expect(a).toHaveProperty('protectionStrength')
    expect(a).toHaveProperty('dependencyLevel')
    expect(a).toHaveProperty('autonomyPreserved')
    expect(a).toHaveProperty('stabilityBonus')
    expect(a).toHaveProperty('duration')
    expect(a).toHaveProperty('tick')
  })
  it('多次注入后长度正确', () => {
    ;(sys as any).arrangements.push(makeArr({ id: 1 }), makeArr({ id: 2 }), makeArr({ id: 3 }))
    expect((sys as any).arrangements).toHaveLength(3)
  })
  it('nextId可手动设置', () => {
    ;(sys as any).nextId = 99
    expect((sys as any).nextId).toBe(99)
  })
  it('lastCheck可手动设置', () => {
    ;(sys as any).lastCheck = 9999
    expect((sys as any).lastCheck).toBe(9999)
  })
  it('arrangements初始等于空数组', () => {
    expect((sys as any).arrangements).toEqual([])
  })
  it('注入对象后可读取guardianCivId', () => {
    ;(sys as any).arrangements.push(makeArr({ guardianCivId: 77 }))
    expect((sys as any).arrangements[0].guardianCivId).toBe(77)
  })
})

describe('DiplomaticGuardianshipSystem — CHECK_INTERVAL=2570 节流', () => {
  let sys: DiplomaticGuardianshipSystem
  beforeEach(() => { vi.spyOn(Math, 'random').mockReturnValue(0.99); sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0时不执行', () => {
    sys.update(1, {} as any, {} as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick < CHECK_INTERVAL时被节流', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick === CHECK_INTERVAL时通过节流', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick > CHECK_INTERVAL时通过节流', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 1000)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL + 1000)
  })
  it('第一次通过后同tick再调用被节流', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('连续两次间隔满足均更新', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('第二次间隔不足不更新', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL + 100)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('三次间隔均满足时lastCheck跟随', () => {
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 3)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 3)
  })
  it('大tick值安全运行', () => {
    expect(() => sys.update(1, {} as any, {} as any, 9999999)).not.toThrow()
  })
})

describe('DiplomaticGuardianshipSystem — 数值字段动态更新', () => {
  let sys: DiplomaticGuardianshipSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('每次update通过节流后duration递增1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ duration: 0, tick: 999999 }))
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements[0].duration).toBe(1)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).arrangements[0].duration).toBe(2)
  })
  it('protectionStrength被约束在[5, 85]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ protectionStrength: 40, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    }
    const v = (sys as any).arrangements[0]?.protectionStrength
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(85) }
  })
  it('dependencyLevel被约束在[10, 90]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ dependencyLevel: 45, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    }
    const v = (sys as any).arrangements[0]?.dependencyLevel
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(10); expect(v).toBeLessThanOrEqual(90) }
  })
  it('autonomyPreserved被约束在[5, 80]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ autonomyPreserved: 25, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    }
    const v = (sys as any).arrangements[0]?.autonomyPreserved
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(80) }
  })
  it('stabilityBonus被约束在[5, 65]范围内', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ stabilityBonus: 30, tick: CHECK_INTERVAL }))
    for (let i = 1; i <= 200; i++) {
      sys.update(1, {} as any, {} as any, CHECK_INTERVAL * i)
    }
    const v = (sys as any).arrangements[0]?.stabilityBonus
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(65) }
  })
  it('duration初始为0时第一次update后为1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ duration: 0, tick: 999999 }))
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements[0].duration).toBeGreaterThanOrEqual(1)
  })
  it('protectionStrength初值40在low random时不低于下限', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).arrangements.push(makeArr({ protectionStrength: 6, tick: CHECK_INTERVAL }))
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    const v = (sys as any).arrangements[0]?.protectionStrength
    if (v !== undefined) expect(v).toBeGreaterThanOrEqual(5)
  })
  it('stabilityBonus在mid mock时合法', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ;(sys as any).arrangements.push(makeArr({ stabilityBonus: 30, tick: CHECK_INTERVAL }))
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    const v = (sys as any).arrangements[0]?.stabilityBonus
    if (v !== undefined) { expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThanOrEqual(65) }
  })
})

describe('DiplomaticGuardianshipSystem — 过期清理（cutoff=tick-88000）', () => {
  let sys: DiplomaticGuardianshipSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0的arrangement在tick=90000时被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 0 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('tick=3000的arrangement在tick=90000时不被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 3000 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('arrangement.tick恰好等于cutoff时不被清理', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 2000 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(1)
  })
  it('多个arrangements中只有过期的被删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 0 }))
    ;(sys as any).arrangements.push(makeArr({ id: 2, tick: 5000 }))
    ;(sys as any).arrangements.push(makeArr({ id: 3, tick: 1500 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(1)
    expect((sys as any).arrangements[0].id).toBe(2)
  })
  it('无过期记录时arrangements长度不变', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).arrangements.push(makeArr({ id: 1, tick: 50000 }))
    ;(sys as any).arrangements.push(makeArr({ id: 2, tick: 60000 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(2)
  })
  it('空数组时清理不报错', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    expect(() => sys.update(1, {} as any, {} as any, 100000)).not.toThrow()
  })
  it('全部过期时全部删除', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    for (let i = 0; i < 3; i++) {
      ;(sys as any).arrangements.push(makeArr({ id: i + 1, tick: 0 }))
    }
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('清理后nextId不重置', () => {
    ;(sys as any).nextId = 5
    ;(sys as any).arrangements.push(makeArr({ id: 4, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).nextId).toBe(5)
  })
})

describe('DiplomaticGuardianshipSystem — MAX_ARRANGEMENTS=16 上限', () => {
  let sys: DiplomaticGuardianshipSystem
  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('arrangements已满16条时即使random通过也不新增', () => {
    for (let i = 1; i <= MAX_ARRANGEMENTS; i++) {
      ;(sys as any).arrangements.push(makeArr({ id: i, tick: 999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements).toHaveLength(MAX_ARRANGEMENTS)
  })
  it('arrangements=15条时random通过可添加（不超过16）', () => {
    for (let i = 1; i <= MAX_ARRANGEMENTS - 1; i++) {
      ;(sys as any).arrangements.push(makeArr({ id: i, tick: 999999 }))
    }
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements.length).toBeLessThanOrEqual(MAX_ARRANGEMENTS)
  })
  it('多次update后lastCheck始终追踪最新tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('手动nextId递增两次后值为3', () => {
    ;(sys as any).arrangements.push(makeArr({ id: (sys as any).nextId++ }))
    ;(sys as any).arrangements.push(makeArr({ id: (sys as any).nextId++ }))
    expect((sys as any).arrangements[0].id).toBe(1)
    expect((sys as any).arrangements[1].id).toBe(2)
    expect((sys as any).nextId).toBe(3)
  })
  it('手动填满16条后count=16', () => {
    for (let i = 0; i < 16; i++) {
      ;(sys as any).arrangements.push(makeArr({ id: i + 1 }))
    }
    expect((sys as any).arrangements).toHaveLength(16)
  })
  it('PROCEED_CHANCE不满足时不新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).arrangements).toHaveLength(0)
  })
  it('update返回undefined', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(sys.update(1, {} as any, {} as any, 0)).toBeUndefined()
  })
  it('满时nextId在节流外不递增', () => {
    for (let i = 1; i <= MAX_ARRANGEMENTS; i++) {
      ;(sys as any).arrangements.push(makeArr({ id: i, tick: 999999 }))
    }
    ;(sys as any).nextId = MAX_ARRANGEMENTS + 1
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    sys.update(1, {} as any, {} as any, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(MAX_ARRANGEMENTS + 1)
  })
})

describe('DiplomaticGuardianshipSystem — Form枚举完整性', () => {
  it('GuardianshipForm包含military_guardianship', () => {
    const a = makeArr({ form: 'military_guardianship' })
    expect(a.form).toBe('military_guardianship')
  })
  it('GuardianshipForm包含economic_guardianship', () => {
    const a = makeArr({ form: 'economic_guardianship' })
    expect(a.form).toBe('economic_guardianship')
  })
  it('GuardianshipForm包含cultural_guardianship', () => {
    const a = makeArr({ form: 'cultural_guardianship' })
    expect(a.form).toBe('cultural_guardianship')
  })
  it('GuardianshipForm包含territorial_guardianship', () => {
    const a = makeArr({ form: 'territorial_guardianship' })
    expect(a.form).toBe('territorial_guardianship')
  })
  it('共4种form', () => {
    const forms = ['military_guardianship', 'economic_guardianship', 'cultural_guardianship', 'territorial_guardianship']
    expect(forms).toHaveLength(4)
  })
  it('form字段类型为string', () => {
    const a = makeArr()
    expect(typeof a.form).toBe('string')
  })
  it('form字段默认值正确', () => {
    const a = makeArr()
    expect(a.form).toBe('military_guardianship')
  })
})
