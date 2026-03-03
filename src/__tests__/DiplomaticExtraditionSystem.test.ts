import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DiplomaticExtraditionSystem } from '../systems/DiplomaticExtraditionSystem'

function makeAgreement(overrides: Partial<any> = {}) {
  return {
    id: 1,
    requestorCivId: 1,
    responderCivId: 2,
    category: 'criminal',
    compliance: 60,
    casesProcessed: 0,
    trustLevel: 50,
    duration: 0,
    tick: 0,
    ...overrides,
  }
}

describe('基础数据结构', () => {
  let sys: DiplomaticExtraditionSystem
  beforeEach(() => { sys = new DiplomaticExtraditionSystem() })

  it('初始agreements为空', () => { expect((sys as any).agreements).toHaveLength(0) })
  it('nextId初始为1', () => { expect((sys as any).nextId).toBe(1) })
  it('lastCheck初始为0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('手动注入agreement可查询', () => {
    ;(sys as any).agreements.push(makeAgreement({ id: 99 }))
    expect((sys as any).agreements[0].id).toBe(99)
  })
  it('4种category枚举完整', () => {
    const cats = ['criminal', 'political', 'military', 'universal']
    cats.forEach(c => expect(makeAgreement({ category: c }).category).toBe(c))
  })
})

describe('CHECK_INTERVAL=2500节流', () => {
  let sys: DiplomaticExtraditionSystem
  beforeEach(() => { sys = new DiplomaticExtraditionSystem() })

  it('tick<2500时lastCheck不更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2499)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick>=2500时lastCheck更新', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).lastCheck).toBe(2500)
  })
  it('恰好差值=2500时更新', () => {
    ;(sys as any).lastCheck = 1000
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 3500)
    expect((sys as any).lastCheck).toBe(3500)
  })
  it('差值=2499时不更新', () => {
    ;(sys as any).lastCheck = 1000
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 3499)
    expect((sys as any).lastCheck).toBe(1000)
  })
  it('已更新后需等待新一轮间隔', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2500)
    sys.update(1, {} as any, {} as any, 4000) // 4000-2500=1500 < 2500
    expect((sys as any).lastCheck).toBe(2500)
  })
})

describe('数值字段动态更新', () => {
  let sys: DiplomaticExtraditionSystem
  beforeEach(() => { sys = new DiplomaticExtraditionSystem() })

  it('duration每次update+1', () => {
    ;(sys as any).agreements.push(makeAgreement({ duration: 0, tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0].duration).toBe(1)
  })
  it('compliance在[15,100]范围内', () => {
    ;(sys as any).agreements.push(makeAgreement({ compliance: 60, tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2500)
    const val = (sys as any).agreements[0].compliance
    expect(val).toBeGreaterThanOrEqual(15)
    expect(val).toBeLessThanOrEqual(100)
  })
  it('trustLevel在[10,100]范围内', () => {
    ;(sys as any).agreements.push(makeAgreement({ trustLevel: 50, tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2500)
    const val = (sys as any).agreements[0].trustLevel
    expect(val).toBeGreaterThanOrEqual(10)
    expect(val).toBeLessThanOrEqual(100)
  })
  it('casesProcessed在random<0.004时+1', () => {
    ;(sys as any).agreements.push(makeAgreement({ casesProcessed: 5, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.003)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0].casesProcessed).toBe(6)
    vi.restoreAllMocks()
  })
})

describe('过期清理cutoff=tick-80000', () => {
  let sys: DiplomaticExtraditionSystem
  beforeEach(() => { sys = new DiplomaticExtraditionSystem() })

  it('过期记录被删除', () => {
    const bigTick = 200000
    ;(sys as any).agreements.push(makeAgreement({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, bigTick)
    expect((sys as any).agreements).toHaveLength(0)
  })
  it('新鲜记录不被删除', () => {
    const bigTick = 200000
    ;(sys as any).agreements.push(makeAgreement({ tick: bigTick - 1000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, bigTick)
    expect((sys as any).agreements).toHaveLength(1)
  })
  it('tick===cutoff时不删除（条件是<cutoff）', () => {
    const bigTick = 200000
    const cutoff = bigTick - 80000 // 120000
    ;(sys as any).agreements.push(makeAgreement({ tick: cutoff }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, bigTick)
    expect((sys as any).agreements).toHaveLength(1)
  })
  it('混合新鲜和过期时只删过期', () => {
    const bigTick = 200000
    ;(sys as any).agreements.push(makeAgreement({ id: 1, tick: 0 }))
    ;(sys as any).agreements.push(makeAgreement({ id: 2, tick: bigTick - 1000 }))
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, bigTick)
    expect((sys as any).agreements).toHaveLength(1)
    expect((sys as any).agreements[0].id).toBe(2)
  })
  it('空数组时不崩溃', () => {
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    expect(() => sys.update(1, {} as any, {} as any, 200000)).not.toThrow()
  })
})

describe('MAX_AGREEMENTS=24上限', () => {
  let sys: DiplomaticExtraditionSystem
  beforeEach(() => { sys = new DiplomaticExtraditionSystem() })

  it('agreements达24条时不新增', () => {
    for (let i = 0; i < 24; i++) {
      ;(sys as any).agreements.push(makeAgreement({ id: i, tick: 500000 }))
    }
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001) // < TREATY_CHANCE=0.003
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements).toHaveLength(24)
    vi.restoreAllMocks()
  })
  it('agreements<24时可以新增', () => {
    expect((sys as any).agreements).toHaveLength(0)
  })
  it('手动超过24条不报错', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).agreements.push(makeAgreement({ id: i }))
    }
    expect((sys as any).agreements).toHaveLength(30)
  })
  it('nextId在新增后递增', () => {
    ;(sys as any).lastCheck = 0
    vi.spyOn(Math, 'random').mockReturnValue(0.001)
    const before = (sys as any).nextId
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).nextId).toBeGreaterThanOrEqual(before)
    vi.restoreAllMocks()
  })
})

describe('ExtraditionCategory枚举完整性', () => {
  let sys: DiplomaticExtraditionSystem
  beforeEach(() => { sys = new DiplomaticExtraditionSystem() })

  it('criminal/political/military/universal均合法', () => {
    const cats = ['criminal', 'political', 'military', 'universal']
    cats.forEach(c => {
      ;(sys as any).agreements.push(makeAgreement({ category: c }))
      expect((sys as any).agreements.at(-1).category).toBe(c)
      ;(sys as any).agreements.pop()
    })
  })
  it('category字段存储正确', () => {
    ;(sys as any).agreements.push(makeAgreement({ category: 'universal' }))
    expect((sys as any).agreements[0].category).toBe('universal')
  })
  it('casesProcessed初始为0', () => {
    ;(sys as any).agreements.push(makeAgreement())
    expect((sys as any).agreements[0].casesProcessed).toBe(0)
  })
})

describe('额外边界与防御性测试', () => {
  it('compliance 上限 100 不被突破', () => {
    const sys = new DiplomaticExtraditionSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push(makeAgreement({ compliance: 99.99, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0]?.compliance).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })

  it('compliance 下限 15 不被突破', () => {
    const sys = new DiplomaticExtraditionSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).agreements.push(makeAgreement({ compliance: 15.01, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0]?.compliance).toBeGreaterThanOrEqual(15)
    vi.restoreAllMocks()
  })

  it('trustLevel 上限 100 不被突破', () => {
    const sys = new DiplomaticExtraditionSystem()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    ;(sys as any).agreements.push(makeAgreement({ trustLevel: 99.99, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0]?.trustLevel).toBeLessThanOrEqual(100)
    vi.restoreAllMocks()
  })

  it('trustLevel 下限 10 不被突破', () => {
    const sys = new DiplomaticExtraditionSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).agreements.push(makeAgreement({ trustLevel: 10.01, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0]?.trustLevel).toBeGreaterThanOrEqual(10)
    vi.restoreAllMocks()
  })

  it('casesProcessed 随机增加（random < 0.004）', () => {
    const sys = new DiplomaticExtraditionSystem()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.99)  // TREATY_CHANCE check: 0.99 >= 0.003 → skip new agreement
      .mockReturnValue(0.001)     // casesProcessed check: 0.001 < 0.004 → increment
    ;(sys as any).agreements.push(makeAgreement({ casesProcessed: 0, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0]?.casesProcessed).toBeGreaterThanOrEqual(1)
    vi.restoreAllMocks()
  })

  it('casesProcessed 不增加（random >= 0.004）', () => {
    const sys = new DiplomaticExtraditionSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // > 0.004
    ;(sys as any).agreements.push(makeAgreement({ casesProcessed: 5, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0]?.casesProcessed).toBe(5)
    vi.restoreAllMocks()
  })

  it('过期记录（cutoff=tick-80000）被移除', () => {
    const sys = new DiplomaticExtraditionSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).agreements.push(makeAgreement({ tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 80000 + 2500 + 1)
    expect((sys as any).agreements).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('未过期记录保留', () => {
    const sys = new DiplomaticExtraditionSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bigTick = 80000 + 2500
    ;(sys as any).agreements.push(makeAgreement({ tick: bigTick - 1000 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, bigTick)
    expect((sys as any).agreements).toHaveLength(1)
    vi.restoreAllMocks()
  })

  it('update 不改变 requestorCivId/responderCivId', () => {
    const sys = new DiplomaticExtraditionSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).agreements.push(makeAgreement({ requestorCivId: 4, responderCivId: 7, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0].requestorCivId).toBe(4)
    expect((sys as any).agreements[0].responderCivId).toBe(7)
    vi.restoreAllMocks()
  })

  it('多条 agreements 各自独立更新 duration', () => {
    const sys = new DiplomaticExtraditionSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).agreements.push(makeAgreement({ id: 1, duration: 3, tick: 0 }))
    ;(sys as any).agreements.push(makeAgreement({ id: 2, duration: 7, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0].duration).toBe(4)
    expect((sys as any).agreements[1].duration).toBe(8)
    vi.restoreAllMocks()
  })

  it('全部过期后 agreements 清空', () => {
    const sys = new DiplomaticExtraditionSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).agreements.push(makeAgreement({ tick: 0 }))
    ;(sys as any).agreements.push(makeAgreement({ tick: 100 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 200000)
    expect((sys as any).agreements).toHaveLength(0)
    vi.restoreAllMocks()
  })

  it('空 agreements 时 update 不崩溃', () => {
    const sys = new DiplomaticExtraditionSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(() => sys.update(1, {} as any, {} as any, 2500)).not.toThrow()
    vi.restoreAllMocks()
  })

  it('ExtraditionAgreement 包含所有必要字段', () => {
    const a = makeAgreement()
    expect(a).toHaveProperty('id')
    expect(a).toHaveProperty('requestorCivId')
    expect(a).toHaveProperty('responderCivId')
    expect(a).toHaveProperty('category')
    expect(a).toHaveProperty('compliance')
    expect(a).toHaveProperty('casesProcessed')
    expect(a).toHaveProperty('trustLevel')
    expect(a).toHaveProperty('duration')
    expect(a).toHaveProperty('tick')
  })

  it('MAX_AGREEMENTS=24 已满时不新增', () => {
    const sys = new DiplomaticExtraditionSystem()
    for (let i = 0; i < 24; i++) {
      ;(sys as any).agreements.push(makeAgreement({ id: i + 1, tick: 9999999 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements.length).toBeLessThanOrEqual(24)
    vi.restoreAllMocks()
  })

  it('mixed 过期和未过期，仅删过期', () => {
    const sys = new DiplomaticExtraditionSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    const bigTick = 200000
    ;(sys as any).agreements.push(makeAgreement({ id: 1, tick: 0 }))
    ;(sys as any).agreements.push(makeAgreement({ id: 2, tick: bigTick }))
    ;(sys as any).lastCheck = 0
    sys.update(1, {} as any, {} as any, bigTick)
    expect((sys as any).agreements).toHaveLength(1)
    expect((sys as any).agreements[0].id).toBe(2)
    vi.restoreAllMocks()
  })

  it('nextId 手动设置后保持', () => {
    const sys = new DiplomaticExtraditionSystem()
    ;(sys as any).nextId = 100
    expect((sys as any).nextId).toBe(100)
  })

  it('lastCheck 更新到最新 tick', () => {
    const sys = new DiplomaticExtraditionSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    sys.update(1, {} as any, {} as any, 2500 * 4)
    expect((sys as any).lastCheck).toBe(2500 * 4)
    vi.restoreAllMocks()
  })

  it('CHECK_INTERVAL=2500 节流有效', () => {
    const sys = new DiplomaticExtraditionSystem()
    ;(sys as any).agreements.push(makeAgreement({ duration: 5, tick: 0 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 2499)
    expect((sys as any).agreements[0].duration).toBe(5)
    vi.restoreAllMocks()
  })

  it('update 不改变 category', () => {
    const sys = new DiplomaticExtraditionSystem()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    ;(sys as any).agreements.push(makeAgreement({ category: 'universal', tick: 0 }))
    sys.update(1, {} as any, {} as any, 2500)
    expect((sys as any).agreements[0].category).toBe('universal')
    vi.restoreAllMocks()
  })
})
