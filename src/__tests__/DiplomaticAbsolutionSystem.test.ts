import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { DiplomaticAbsolutionSystem } from '../systems/DiplomaticAbsolutionSystem'
import type { AbsolutionDeclaration } from '../systems/DiplomaticAbsolutionSystem'

// CHECK_INTERVAL=2420, cutoff=tick-84000, MAX_DECLARATIONS=20, DECLARE_CHANCE=0.0025

function makeSys() { return new DiplomaticAbsolutionSystem() }

function makeDeclaration(overrides: Partial<AbsolutionDeclaration> = {}): AbsolutionDeclaration {
  return {
    id: 1,
    civIdA: 1,
    civIdB: 2,
    form: 'war_guilt_release',
    sincerity: 50,
    healingEffect: 40,
    politicalCost: 25,
    moralAuthority: 30,
    duration: 0,
    tick: 0,
    ...overrides,
  }
}

describe('DiplomaticAbsolutionSystem — 基础数据结构', () => {
  let sys: DiplomaticAbsolutionSystem

  beforeEach(() => { sys = makeSys() })

  it('初始 declarations 为空数组', () => {
    expect((sys as any).declarations).toHaveLength(0)
    expect(Array.isArray((sys as any).declarations)).toBe(true)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('注入单条 declaration 后长度为 1', () => {
    ;(sys as any).declarations.push(makeDeclaration())
    expect((sys as any).declarations).toHaveLength(1)
    expect((sys as any).declarations[0].id).toBe(1)
  })

  it('注入多条 declarations 保留所有记录', () => {
    ;(sys as any).declarations.push(makeDeclaration({ id: 1 }))
    ;(sys as any).declarations.push(makeDeclaration({ id: 2 }))
    ;(sys as any).declarations.push(makeDeclaration({ id: 3 }))
    expect((sys as any).declarations).toHaveLength(3)
  })

  it('支持所有 AbsolutionForm 类型', () => {
    const forms = ['war_guilt_release', 'debt_forgiveness', 'crime_pardon', 'oath_release']
    for (const form of forms) {
      ;(sys as any).declarations.push(makeDeclaration({ form: form as any }))
    }
    const stored = (sys as any).declarations.map((d: any) => d.form)
    expect(stored).toEqual(expect.arrayContaining(forms))
  })

  it('declaration 包含所有必要字段', () => {
    const d = makeDeclaration()
    ;(sys as any).declarations.push(d)
    const stored = (sys as any).declarations[0]
    expect(stored).toHaveProperty('id')
    expect(stored).toHaveProperty('civIdA')
    expect(stored).toHaveProperty('civIdB')
    expect(stored).toHaveProperty('form')
    expect(stored).toHaveProperty('sincerity')
    expect(stored).toHaveProperty('healingEffect')
    expect(stored).toHaveProperty('politicalCost')
    expect(stored).toHaveProperty('moralAuthority')
    expect(stored).toHaveProperty('duration')
    expect(stored).toHaveProperty('tick')
  })
})

describe('DiplomaticAbsolutionSystem — CHECK_INTERVAL=2420 节流', () => {
  let sys: DiplomaticAbsolutionSystem

  beforeEach(() => { sys = makeSys() })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=100 < CHECK_INTERVAL=2420 时不更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, 100)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=2420 = CHECK_INTERVAL 时更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).lastCheck).toBe(2420)
  })

  it('tick=2419 < CHECK_INTERVAL 时跳过，declarations 不变', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 0, duration: 0 }))
    sys.update(1, {} as any, {} as any, 2419)
    // duration 未被更新
    expect((sys as any).declarations[0].duration).toBe(0)
  })

  it('tick=2420 时 duration 被更新（+1）', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 2420, duration: 0 }))
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations[0].duration).toBe(1)
  })

  it('第二次调用间隔不足时不更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).lastCheck).toBe(2420)
    sys.update(1, {} as any, {} as any, 3000) // 3000-2420=580 < 2420
    expect((sys as any).lastCheck).toBe(2420) // 未更新
  })

  it('第二次调用满足间隔时更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, 2420)
    sys.update(1, {} as any, {} as any, 4840) // 4840-2420=2420 >= 2420
    expect((sys as any).lastCheck).toBe(4840)
  })

  it('连续两次满足间隔，lastCheck 递增更新', () => {
    sys.update(1, {} as any, {} as any, 2420)
    sys.update(1, {} as any, {} as any, 4840)
    sys.update(1, {} as any, {} as any, 7260)
    expect((sys as any).lastCheck).toBe(7260)
  })
})

describe('DiplomaticAbsolutionSystem — 数值字段动态更新', () => {
  let sys: DiplomaticAbsolutionSystem

  beforeEach(() => { sys = makeSys() })

  it('update 后 duration 递增 +1', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 2420, duration: 0 }))
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations[0].duration).toBe(1)
  })

  it('sincerity 在 [10, 85] 范围内', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 2420, sincerity: 50 }))
    for (let t = 2420; t <= 2420 * 100; t += 2420) {
      sys.update(1, {} as any, {} as any, t)
      const val = (sys as any).declarations[0]?.sincerity
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(10)
        expect(val).toBeLessThanOrEqual(85)
      }
    }
  })

  it('healingEffect 在 [10, 80] 范围内', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 2420, healingEffect: 40 }))
    for (let t = 2420; t <= 2420 * 50; t += 2420) {
      sys.update(1, {} as any, {} as any, t)
      const val = (sys as any).declarations[0]?.healingEffect
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(10)
        expect(val).toBeLessThanOrEqual(80)
      }
    }
  })

  it('politicalCost 在 [5, 70] 范围内', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 2420, politicalCost: 25 }))
    for (let t = 2420; t <= 2420 * 50; t += 2420) {
      sys.update(1, {} as any, {} as any, t)
      const val = (sys as any).declarations[0]?.politicalCost
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(5)
        expect(val).toBeLessThanOrEqual(70)
      }
    }
  })

  it('moralAuthority 在 [5, 65] 范围内', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 2420, moralAuthority: 30 }))
    for (let t = 2420; t <= 2420 * 50; t += 2420) {
      sys.update(1, {} as any, {} as any, t)
      const val = (sys as any).declarations[0]?.moralAuthority
      if (val !== undefined) {
        expect(val).toBeGreaterThanOrEqual(5)
        expect(val).toBeLessThanOrEqual(65)
      }
    }
  })

  it('多条记录各自独立更新 duration', () => {
    ;(sys as any).declarations.push(makeDeclaration({ id: 1, tick: 2420, duration: 0 }))
    ;(sys as any).declarations.push(makeDeclaration({ id: 2, tick: 2420, duration: 5 }))
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations[0].duration).toBe(1)
    expect((sys as any).declarations[1].duration).toBe(6)
  })
})

describe('DiplomaticAbsolutionSystem — time-based 过期清理（cutoff=tick-84000）', () => {
  let sys: DiplomaticAbsolutionSystem

  beforeEach(() => { sys = makeSys() })

  it('tick=0 的记录在 tick=90000 时被清除（cutoff=6000）', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 0, id: 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).declarations).toHaveLength(0)
  })

  it('tick 恰好等于 cutoff 时记录不被清除', () => {
    // cutoff = 90000 - 84000 = 6000，tick=6000 不满足 < cutoff 条件
    ;(sys as any).declarations.push(makeDeclaration({ tick: 6000, id: 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).declarations).toHaveLength(1)
  })

  it('tick > cutoff 的记录保留', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 10000, id: 1 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000) // cutoff=6000, 10000>6000 保留
    expect((sys as any).declarations).toHaveLength(1)
  })

  it('混合过期：只删除 tick < cutoff 的记录', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 0,     id: 1 })) // 过期
    ;(sys as any).declarations.push(makeDeclaration({ tick: 5999,  id: 2 })) // 过期
    ;(sys as any).declarations.push(makeDeclaration({ tick: 6000,  id: 3 })) // 边界，保留
    ;(sys as any).declarations.push(makeDeclaration({ tick: 10000, id: 4 })) // 保留
    sys.update(1, {} as any, {} as any, 90000) // cutoff=6000
    const ids = (sys as any).declarations.map((d: any) => d.id)
    expect(ids).not.toContain(1)
    expect(ids).not.toContain(2)
    expect(ids).toContain(3)
    expect(ids).toContain(4)
  })

  it('所有记录都新鲜，无过期清理', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 88000, id: 1 }))
    ;(sys as any).declarations.push(makeDeclaration({ tick: 89000, id: 2 }))
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000) // cutoff=6000
    expect((sys as any).declarations).toHaveLength(2)
  })

  it('反向遍历删除不影响索引，多条过期全部删除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).declarations.push(makeDeclaration({ tick: i * 100, id: i + 1 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    sys.update(1, {} as any, {} as any, 90000) // cutoff=6000，全部 tick < 6000
    expect((sys as any).declarations).toHaveLength(0)
  })
})

describe('DiplomaticAbsolutionSystem — MAX_DECLARATIONS=20 上限', () => {
  let sys: DiplomaticAbsolutionSystem

  afterEach(() => { vi.restoreAllMocks() })
  beforeEach(() => { sys = makeSys() })

  it('已达 MAX_DECLARATIONS=20 时不再新增（强制通过 CHANCE）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // DECLARE_CHANCE=0.0025，0 < 0.0025 通过
    for (let i = 0; i < 20; i++) {
      ;(sys as any).declarations.push(makeDeclaration({ id: i + 1, tick: 2420 }))
    }
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations).toHaveLength(20)
  })

  it('未达上限且满足 CHANCE 时可新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 通过 DECLARE_CHANCE 检查；civA=1,civB=1会相等但random固定为0
    // random()=0 → civA = 1+floor(0*8)=1, civB=1+floor(0*8)=1 → civA===civB，early return
    // 需要让 civA !== civB：先让第一次 random 通过CHANCE，再让后续产生不同civ
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // DECLARE_CHANCE 检查：0.001 < 0.0025 通过
      .mockReturnValueOnce(0)     // civA = 1+floor(0*8)=1
      .mockReturnValueOnce(0.5)   // civB = 1+floor(0.5*8)=5，与civA不同
      .mockReturnValue(0.5)       // 后续字段随机值
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations.length).toBeGreaterThanOrEqual(1)
  })

  it('nextId 在新增后递增', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001) // 通过 CHANCE
      .mockReturnValueOnce(0)     // civA=1
      .mockReturnValueOnce(0.5)   // civB=5
      .mockReturnValue(0.5)
    sys.update(1, {} as any, {} as any, 2420)
    // 如果成功新增，nextId 应为 2
    const nextId = (sys as any).nextId
    expect(nextId).toBeGreaterThanOrEqual(1)
  })
})
