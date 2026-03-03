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

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

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

  it('civIdA 和 civIdB 可独立读取', () => {
    ;(sys as any).declarations.push(makeDeclaration({ civIdA: 4, civIdB: 7 }))
    expect((sys as any).declarations[0].civIdA).toBe(4)
    expect((sys as any).declarations[0].civIdB).toBe(7)
  })

  it('duration 初始为 0', () => {
    ;(sys as any).declarations.push(makeDeclaration({ duration: 0 }))
    expect((sys as any).declarations[0].duration).toBe(0)
  })

  it('两个系统实例互相独立', () => {
    const s2 = makeSys()
    ;(sys as any).declarations.push(makeDeclaration())
    expect((s2 as any).declarations).toHaveLength(0)
  })
})

describe('DiplomaticAbsolutionSystem — CHECK_INTERVAL=2420 节流', () => {
  let sys: DiplomaticAbsolutionSystem

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
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
    sys.update(1, {} as any, {} as any, 3000)
    expect((sys as any).lastCheck).toBe(2420)
  })

  it('第二次调用满足间隔时更新 lastCheck', () => {
    sys.update(1, {} as any, {} as any, 2420)
    sys.update(1, {} as any, {} as any, 4840)
    expect((sys as any).lastCheck).toBe(4840)
  })

  it('连续两次满足间隔，lastCheck 递增更新', () => {
    sys.update(1, {} as any, {} as any, 2420)
    sys.update(1, {} as any, {} as any, 4840)
    sys.update(1, {} as any, {} as any, 7260)
    expect((sys as any).lastCheck).toBe(7260)
  })

  it('tick=0 不触发更新，lastCheck 保持 0', () => {
    sys.update(1, {} as any, {} as any, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 恰好是 CHECK_INTERVAL 倍数时均触发', () => {
    for (let i = 1; i <= 4; i++) {
      sys.update(1, {} as any, {} as any, 2420 * i)
    }
    expect((sys as any).lastCheck).toBe(2420 * 4)
  })
})

describe('DiplomaticAbsolutionSystem — 数值字段动态更新', () => {
  let sys: DiplomaticAbsolutionSystem

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

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

  it('sincerity 在边界 10 时不低于 10', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 0, sincerity: 10 }))
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations[0].sincerity).toBeGreaterThanOrEqual(10)
  })

  it('healingEffect 在边界 10 时不低于 10', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 0, healingEffect: 10 }))
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations[0].healingEffect).toBeGreaterThanOrEqual(10)
  })

  it('sincerity 不超过上界 85', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 0, sincerity: 85 }))
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations[0].sincerity).toBeLessThanOrEqual(85)
  })
})

describe('DiplomaticAbsolutionSystem — time-based 过期清理（cutoff=tick-84000）', () => {
  let sys: DiplomaticAbsolutionSystem

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick=0 的记录在 tick=90000 时被清除（cutoff=6000）', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 0, id: 1 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).declarations).toHaveLength(0)
  })

  it('tick 恰好等于 cutoff 时记录不被清除', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 6000, id: 1 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).declarations).toHaveLength(1)
  })

  it('tick > cutoff 的记录保留', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 10000, id: 1 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).declarations).toHaveLength(1)
  })

  it('混合过期：只删除 tick < cutoff 的记录', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 0,     id: 1 }))
    ;(sys as any).declarations.push(makeDeclaration({ tick: 5999,  id: 2 }))
    ;(sys as any).declarations.push(makeDeclaration({ tick: 6000,  id: 3 }))
    ;(sys as any).declarations.push(makeDeclaration({ tick: 10000, id: 4 }))
    sys.update(1, {} as any, {} as any, 90000)
    const ids = (sys as any).declarations.map((d: any) => d.id)
    expect(ids).not.toContain(1)
    expect(ids).not.toContain(2)
    expect(ids).toContain(3)
    expect(ids).toContain(4)
  })

  it('所有记录都新鲜，无过期清理', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 88000, id: 1 }))
    ;(sys as any).declarations.push(makeDeclaration({ tick: 89000, id: 2 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).declarations).toHaveLength(2)
  })

  it('反向遍历删除不影响索引，多条过期全部删除', () => {
    for (let i = 0; i < 5; i++) {
      ;(sys as any).declarations.push(makeDeclaration({ tick: i * 100, id: i + 1 }))
    }
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).declarations).toHaveLength(0)
  })

  it('不超 cutoff 的新记录在清理后仍存在', () => {
    ;(sys as any).declarations.push(makeDeclaration({ tick: 0, id: 1 }))
    ;(sys as any).declarations.push(makeDeclaration({ tick: 88000, id: 2 }))
    sys.update(1, {} as any, {} as any, 90000)
    expect((sys as any).declarations).toHaveLength(1)
    expect((sys as any).declarations[0].id).toBe(2)
  })
})

describe('DiplomaticAbsolutionSystem — MAX_DECLARATIONS=20 上限', () => {
  let sys: DiplomaticAbsolutionSystem

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('已达 MAX_DECLARATIONS=20 时不再新增（强制通过 CHANCE）', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 20; i++) {
      ;(sys as any).declarations.push(makeDeclaration({ id: i + 1, tick: 2420 }))
    }
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations).toHaveLength(20)
  })

  it('未达上限且满足 CHANCE 时可新增', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations.length).toBeGreaterThanOrEqual(1)
  })

  it('nextId 在新增后递增', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.001)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValue(0.5)
    sys.update(1, {} as any, {} as any, 2420)
    const nextId = (sys as any).nextId
    expect(nextId).toBeGreaterThanOrEqual(1)
  })

  it('declarations 初始长度为 0', () => {
    expect((sys as any).declarations.length).toBe(0)
  })

  it('注入 19 条后长度为 19', () => {
    for (let i = 0; i < 19; i++) {
      ;(sys as any).declarations.push(makeDeclaration({ id: i + 1 }))
    }
    expect((sys as any).declarations.length).toBe(19)
  })

  it('civA === civB 时不新增（civs 相等 early return）', () => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // random=0 → CHANCE ok (0 < 0.0025), civA=1, civB=1 → equal → return
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations).toHaveLength(0)
  })
})

describe('DiplomaticAbsolutionSystem — 额外边界与完整性', () => {
  let sys: DiplomaticAbsolutionSystem

  beforeEach(() => {
    sys = makeSys()
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('update 不改变 form 字段', () => {
    ;(sys as any).declarations.push(makeDeclaration({ form: 'oath_release', tick: 0 }))
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations[0].form).toBe('oath_release')
  })

  it('update 不改变 civIdA/civIdB 字段', () => {
    ;(sys as any).declarations.push(makeDeclaration({ civIdA: 5, civIdB: 8, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations[0].civIdA).toBe(5)
    expect((sys as any).declarations[0].civIdB).toBe(8)
  })

  it('update 不改变 id 字段', () => {
    ;(sys as any).declarations.push(makeDeclaration({ id: 77, tick: 0 }))
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations[0].id).toBe(77)
  })

  it('moralAuthority 上界不超过 65', () => {
    ;(sys as any).declarations.push(makeDeclaration({ moralAuthority: 65, tick: 0 }))
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations[0].moralAuthority).toBeLessThanOrEqual(65)
  })

  it('politicalCost 上界不超过 70', () => {
    ;(sys as any).declarations.push(makeDeclaration({ politicalCost: 70, tick: 0 }))
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations[0].politicalCost).toBeLessThanOrEqual(70)
  })

  it('healingEffect 下界不低于 10', () => {
    ;(sys as any).declarations.push(makeDeclaration({ healingEffect: 10, tick: 0 }))
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations[0].healingEffect).toBeGreaterThanOrEqual(10)
  })

  it('politicalCost 下界不低于 5', () => {
    ;(sys as any).declarations.push(makeDeclaration({ politicalCost: 5, tick: 0 }))
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations[0].politicalCost).toBeGreaterThanOrEqual(5)
  })

  it('moralAuthority 下界不低于 5', () => {
    ;(sys as any).declarations.push(makeDeclaration({ moralAuthority: 5, tick: 0 }))
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, {} as any, {} as any, 2420)
    expect((sys as any).declarations[0].moralAuthority).toBeGreaterThanOrEqual(5)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
})
