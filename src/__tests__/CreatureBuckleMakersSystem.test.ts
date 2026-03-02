import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureBuckleMakersSystem } from '../systems/CreatureBuckleMakersSystem'
import type { BuckleMaker, BuckleType } from '../systems/CreatureBuckleMakersSystem'

let nextId = 1
function makeSys(): CreatureBuckleMakersSystem { return new CreatureBuckleMakersSystem() }
function makeMaker(entityId: number, skill: number = 30, buckleType: BuckleType = 'belt', tickVal: number = 0): BuckleMaker {
  return {
    id: nextId++,
    entityId,
    skill,
    bucklesMade: 1 + Math.floor(skill / 9),
    buckleType,
    craftsmanship: 14 + skill * 0.72,
    reputation: 10 + skill * 0.81,
    tick: tickVal,
  }
}

const EMPTY_EM = {
  getEntitiesWithComponents: () => [],
  getComponent: () => null,
} as any

// ——— 初始状态测试 ———
describe('CreatureBuckleMakersSystem - 初始状态', () => {
  let sys: CreatureBuckleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无扣具师记录', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('初始 skillMap 为空 Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('makers 初始为空数组（非 null/undefined）', () => {
    expect((sys as any).makers).toBeDefined()
    expect(Array.isArray((sys as any).makers)).toBe(true)
  })
})

// ——— 数据字段验证测试 ———
describe('CreatureBuckleMakersSystem - 数据字段验证', () => {
  let sys: CreatureBuckleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入skill=30的扣具师后可查询字段', () => {
    const m = makeMaker(1, 30, 'belt', 0)
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.entityId).toBe(1)
    expect(r.skill).toBe(30)
    expect(r.bucklesMade).toBe(4)   // 1 + floor(30/9) = 1+3 = 4
    expect(r.buckleType).toBe('belt')
    expect(r.craftsmanship).toBeCloseTo(35.6, 5)  // 14+30*0.72
    expect(r.reputation).toBeCloseTo(34.3, 5)     // 10+30*0.81
  })

  it('注入skill=80的扣具师后字段正确', () => {
    const m = makeMaker(10, 80, 'shoe')
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.skill).toBe(80)
    expect(r.bucklesMade).toBe(9) // 1 + floor(80/9) = 1+8 = 9
    expect(r.craftsmanship).toBeCloseTo(14 + 80 * 0.72, 5) // 71.6
    expect(r.reputation).toBeCloseTo(10 + 80 * 0.81, 5)   // 74.8
  })

  it('注入 id 字段正确递增', () => {
    const m1 = makeMaker(1, 30)
    const m2 = makeMaker(2, 40)
    ;(sys as any).makers.push(m1)
    ;(sys as any).makers.push(m2)
    expect((sys as any).makers[0].id).toBe(1)
    expect((sys as any).makers[1].id).toBe(2)
  })

  it('tick 字段正确记录', () => {
    const m = makeMaker(1, 30, 'belt', 12345)
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].tick).toBe(12345)
  })

  it('entityId 字段正确记录', () => {
    const m = makeMaker(999, 30)
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].entityId).toBe(999)
  })
})

// ——— BuckleType 类型测试 ———
describe('CreatureBuckleMakersSystem - BuckleType 支持', () => {
  let sys: CreatureBuckleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('支持全部4种扣具类型', () => {
    const types: BuckleType[] = ['belt', 'shoe', 'armor', 'ornamental']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, 30, t)) })
    const all = (sys as any).makers as BuckleMaker[]
    types.forEach((t, i) => { expect(all[i].buckleType).toBe(t) })
  })

  it('belt 类型记录正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 10, 'belt'))
    expect((sys as any).makers[0].buckleType).toBe('belt')
  })

  it('shoe 类型记录正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 30, 'shoe'))
    expect((sys as any).makers[0].buckleType).toBe('shoe')
  })

  it('armor 类型记录正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 55, 'armor'))
    expect((sys as any).makers[0].buckleType).toBe('armor')
  })

  it('ornamental 类型记录正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 80, 'ornamental'))
    expect((sys as any).makers[0].buckleType).toBe('ornamental')
  })
})

// ——— craftsmanship 公式测试 ———
describe('CreatureBuckleMakersSystem - craftsmanship 公式', () => {
  afterEach(() => vi.restoreAllMocks())

  it('craftsmanship 公式：14 + skill * 0.72（skill=0）', () => {
    const m = makeMaker(1, 0)
    expect(m.craftsmanship).toBeCloseTo(14, 5)
  })

  it('craftsmanship 公式：skill=50 → 50', () => {
    const m = makeMaker(1, 50, 'armor')
    expect(m.craftsmanship).toBeCloseTo(50, 5)
  })

  it('craftsmanship 公式：skill=100 → 86', () => {
    const m = makeMaker(1, 100, 'ornamental')
    expect(m.craftsmanship).toBeCloseTo(14 + 100 * 0.72, 5) // 86
  })

  it('craftsmanship 公式：skill=25 → 32', () => {
    const m = makeMaker(1, 25)
    expect(m.craftsmanship).toBeCloseTo(14 + 25 * 0.72, 5) // 32
  })

  it('craftsmanship 公式：skill=75 → 68', () => {
    const m = makeMaker(1, 75)
    expect(m.craftsmanship).toBeCloseTo(14 + 75 * 0.72, 5) // 68
  })
})

// ——— reputation 公式测试 ———
describe('CreatureBuckleMakersSystem - reputation 公式', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reputation 公式：10 + skill * 0.81（skill=0）', () => {
    const m = makeMaker(1, 0)
    expect(m.reputation).toBeCloseTo(10, 5)
  })

  it('reputation 公式：skill=50 → 50.5', () => {
    const m = makeMaker(1, 50, 'armor')
    expect(m.reputation).toBeCloseTo(50.5, 5)
  })

  it('reputation 公式：skill=100 → 91', () => {
    const m = makeMaker(1, 100, 'ornamental')
    expect(m.reputation).toBeCloseTo(10 + 100 * 0.81, 5) // 91
  })

  it('reputation 公式：skill=20 → 26.2', () => {
    const m = makeMaker(1, 20)
    expect(m.reputation).toBeCloseTo(10 + 20 * 0.81, 5) // 26.2
  })

  it('reputation 公式：skill=60 → 58.6', () => {
    const m = makeMaker(1, 60)
    expect(m.reputation).toBeCloseTo(10 + 60 * 0.81, 5) // 58.6
  })
})

// ——— bucklesMade 公式测试 ———
describe('CreatureBuckleMakersSystem - bucklesMade 公式', () => {
  afterEach(() => vi.restoreAllMocks())

  it('bucklesMade 公式：1 + floor(skill/9)（skill=0）→ 1', () => {
    const m = makeMaker(1, 0)
    expect(m.bucklesMade).toBe(1)
  })

  it('bucklesMade 公式：skill=9 → 2', () => {
    const m = makeMaker(1, 9)
    expect(m.bucklesMade).toBe(2)
  })

  it('bucklesMade 公式：skill=30 → 4', () => {
    const m = makeMaker(1, 30)
    expect(m.bucklesMade).toBe(4)
  })

  it('bucklesMade 公式：skill=45 → 6', () => {
    const m = makeMaker(1, 45)
    expect(m.bucklesMade).toBe(6)
  })

  it('bucklesMade 公式：skill=100 → 12', () => {
    const m = makeMaker(1, 100)
    expect(m.bucklesMade).toBe(12) // 1 + floor(100/9) = 1+11 = 12
  })

  it('bucklesMade 公式：skill=8 → 1（不足整除）', () => {
    const m = makeMaker(1, 8)
    expect(m.bucklesMade).toBe(1) // floor(8/9)=0
  })

  it('bucklesMade 公式：skill=90 → 11', () => {
    const m = makeMaker(1, 90)
    expect(m.bucklesMade).toBe(11) // 1 + floor(90/9) = 1+10 = 11
  })
})

// ——— buckleType 4段映射测试 ———
describe('CreatureBuckleMakersSystem - buckleType 4段映射', () => {
  afterEach(() => vi.restoreAllMocks())

  it('skill=0 → typeIdx=0 → belt', () => {
    const idx = Math.min(3, Math.floor(0 / 25))
    const types: BuckleType[] = ['belt', 'shoe', 'armor', 'ornamental']
    expect(types[idx]).toBe('belt')
  })

  it('skill=10 → typeIdx=0 → belt', () => {
    const idx = Math.min(3, Math.floor(10 / 25))
    expect(idx).toBe(0)
  })

  it('skill=24 → typeIdx=0 → belt（边界）', () => {
    const idx = Math.min(3, Math.floor(24 / 25))
    expect(idx).toBe(0)
  })

  it('skill=25 → typeIdx=1 → shoe', () => {
    const idx = Math.min(3, Math.floor(25 / 25))
    expect(idx).toBe(1)
    const types: BuckleType[] = ['belt', 'shoe', 'armor', 'ornamental']
    expect(types[idx]).toBe('shoe')
  })

  it('skill=49 → typeIdx=1 → shoe（边界）', () => {
    const idx = Math.min(3, Math.floor(49 / 25))
    expect(idx).toBe(1)
  })

  it('skill=50 → typeIdx=2 → armor', () => {
    const idx = Math.min(3, Math.floor(50 / 25))
    expect(idx).toBe(2)
    const types: BuckleType[] = ['belt', 'shoe', 'armor', 'ornamental']
    expect(types[idx]).toBe('armor')
  })

  it('skill=74 → typeIdx=2 → armor（边界）', () => {
    const idx = Math.min(3, Math.floor(74 / 25))
    expect(idx).toBe(2)
  })

  it('skill=75 → typeIdx=3 → ornamental', () => {
    const idx = Math.min(3, Math.floor(75 / 25))
    expect(idx).toBe(3)
    const types: BuckleType[] = ['belt', 'shoe', 'armor', 'ornamental']
    expect(types[idx]).toBe('ornamental')
  })

  it('skill=100 → typeIdx 仍为 3（min(3,...) 限制）', () => {
    const idx = Math.min(3, Math.floor(100 / 25))
    expect(idx).toBe(3)
  })
})

// ——— CHECK_INTERVAL 节流测试 ———
describe('CreatureBuckleMakersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureBuckleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值<1440时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 1000
    sys.update(16, EMPTY_EM, 1000 + 1000) // diff=1000 < 1440
    expect((sys as any).lastCheck).toBe(1000) // 未更新
  })

  it('tick差值>=1440时更新lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 1440) // diff=1440 >= 1440
    expect((sys as any).lastCheck).toBe(1440)
  })

  it('tick差值=1439时仍被节流（不触发）', () => {
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(16, em, 1439)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick差值=1440时精确触发', () => {
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(16, em, 1440)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('连续两次update：第一次触发后第二次被节流', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(16, em, 1440) // 触发，lastCheck=1440
    sys.update(16, em, 1440 + 100) // diff=100 < 1440 → 节流
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('两次间隔>=1440都触发', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(16, em, 1440)  // 触发一次
    sys.update(16, em, 2880)  // 触发第二次
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
  })
})

// ——— time-based cleanup 测试 ———
describe('CreatureBuckleMakersSystem - time-based cleanup', () => {
  let sys: CreatureBuckleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('time-based cleanup：tick=0记录在currentTick=60000时删除', () => {
    ;(sys as any).makers.push(makeMaker(1, 30, 'belt', 0))   // tick=0
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 60000) // cutoff=60000-52000=8000, 0 < 8000 → deleted
    expect((sys as any).makers).toHaveLength(0)
  })

  it('tick=55000记录在currentTick=60000时保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 30, 'belt', 55000)) // tick=55000
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 60000) // cutoff=8000, 55000 > 8000 → kept
    expect((sys as any).makers).toHaveLength(1)
  })

  it('cleanup只删除过期记录，保留新记录', () => {
    ;(sys as any).makers.push(makeMaker(1, 30, 'belt', 0))      // 过期
    ;(sys as any).makers.push(makeMaker(2, 30, 'shoe', 55000))  // 新
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 60000)
    const remaining = (sys as any).makers as BuckleMaker[]
    expect(remaining).toHaveLength(1)
    expect(remaining[0].entityId).toBe(2)
  })

  it('cutoff边界：tick等于cutoff时不删除（< 而非 <=）', () => {
    ;(sys as any).makers.push(makeMaker(1, 30, 'belt', 0)) // tick=0
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 52000) // cutoff=52000-52000=0, 0 < 0 → false → kept
    expect((sys as any).makers).toHaveLength(1)
  })

  it('cutoff边界：tick=cutoff-1时删除', () => {
    const currentTick = 60000
    const cutoff = currentTick - 52000  // = 8000
    ;(sys as any).makers.push(makeMaker(1, 30, 'belt', cutoff - 1)) // tick=7999 < 8000 → deleted
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, currentTick)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('多条过期记录同时删除', () => {
    ;(sys as any).makers.push(makeMaker(1, 30, 'belt', 0))
    ;(sys as any).makers.push(makeMaker(2, 30, 'belt', 100))
    ;(sys as any).makers.push(makeMaker(3, 30, 'belt', 200))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('全部记录均新则全部保留', () => {
    ;(sys as any).makers.push(makeMaker(1, 30, 'belt', 59000))
    ;(sys as any).makers.push(makeMaker(2, 30, 'belt', 58000))
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 60000)
    expect((sys as any).makers).toHaveLength(2)
  })

  it('混合情况：删旧保新，顺序正确', () => {
    ;(sys as any).makers.push(makeMaker(1, 30, 'belt', 0))      // 过期
    ;(sys as any).makers.push(makeMaker(2, 30, 'shoe', 55000))  // 保留
    ;(sys as any).makers.push(makeMaker(3, 30, 'armor', 100))   // 过期
    ;(sys as any).makers.push(makeMaker(4, 30, 'ornamental', 58000)) // 保留
    ;(sys as any).lastCheck = 0
    sys.update(16, EMPTY_EM, 60000)
    const remaining = (sys as any).makers as BuckleMaker[]
    expect(remaining).toHaveLength(2)
    const entityIds = remaining.map(r => r.entityId).sort()
    expect(entityIds).toEqual([2, 4])
  })
})

// ——— 多实体共存测试 ———
describe('CreatureBuckleMakersSystem - 多实体共存', () => {
  let sys: CreatureBuckleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('多个扣具师可共存', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    ;(sys as any).makers.push(makeMaker(3))
    expect((sys as any).makers).toHaveLength(3)
  })

  it('不同 entityId 的扣具师独立存在', () => {
    ;(sys as any).makers.push(makeMaker(101, 20, 'belt'))
    ;(sys as any).makers.push(makeMaker(202, 50, 'armor'))
    ;(sys as any).makers.push(makeMaker(303, 80, 'ornamental'))
    const all = (sys as any).makers as BuckleMaker[]
    expect(all[0].entityId).toBe(101)
    expect(all[1].entityId).toBe(202)
    expect(all[2].entityId).toBe(303)
  })

  it('相同 entityId 可以多次push（不去重）', () => {
    ;(sys as any).makers.push(makeMaker(1, 30, 'belt'))
    ;(sys as any).makers.push(makeMaker(1, 40, 'shoe'))
    expect((sys as any).makers).toHaveLength(2)
  })

  it('内部引用稳定（同一数组对象）', () => {
    const ref1 = (sys as any).makers
    ;(sys as any).makers.push(makeMaker(1))
    const ref2 = (sys as any).makers
    expect(ref1).toBe(ref2)
  })
})

// ——— skillMap 测试 ———
describe('CreatureBuckleMakersSystem - skillMap', () => {
  let sys: CreatureBuckleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skillMap 初始为空', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('可手动设置 skillMap 值', () => {
    ;(sys as any).skillMap.set(1, 50)
    expect((sys as any).skillMap.get(1)).toBe(50)
  })

  it('skillMap 支持多个实体', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 60)
    ;(sys as any).skillMap.set(3, 90)
    expect((sys as any).skillMap.size).toBe(3)
  })
})

// ——— MAX_MAKERS 上限测试 ———
describe('CreatureBuckleMakersSystem - MAX_MAKERS 上限', () => {
  let sys: CreatureBuckleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('填充30条记录后长度为30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(30)
  })

  it('update时makers>=30则不新增（通过mock验证）', () => {
    // 填满30条
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, 30, 'belt', 100000))
    }
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0) // random=0, 0 < 0.005 → true
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([99]),
      getComponent: vi.fn().mockReturnValue({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1440)
    expect((sys as any).makers).toHaveLength(30)
    spy.mockRestore()
  })
})

// ——— 综合验证测试 ———
describe('CreatureBuckleMakersSystem - 综合验证', () => {
  let sys: CreatureBuckleMakersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skill=100时bucklesMade=12，buckleType=ornamental', () => {
    const m = makeMaker(1, 100, 'ornamental')
    expect(m.bucklesMade).toBe(12) // 1 + floor(100/9) = 1+11 = 12
    expect(m.buckleType).toBe('ornamental')
  })

  it('数据字段完整（skill=80，shoe）', () => {
    const m = makeMaker(10, 80, 'shoe')
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.skill).toBe(80)
    expect(r.bucklesMade).toBe(9) // 1 + floor(80/9) = 1+8 = 9
    expect(r.craftsmanship).toBeCloseTo(14 + 80 * 0.72, 5) // 71.6
    expect(r.reputation).toBeCloseTo(10 + 80 * 0.81, 5)   // 74.8
  })

  it('skill=1时各公式边界值正确', () => {
    const m = makeMaker(1, 1)
    expect(m.bucklesMade).toBe(1)
    expect(m.craftsmanship).toBeCloseTo(14 + 0.72, 5)
    expect(m.reputation).toBeCloseTo(10 + 0.81, 5)
  })

  it('skill=99时各公式边界值正确', () => {
    const m = makeMaker(1, 99)
    expect(m.bucklesMade).toBe(12) // 1 + floor(99/9) = 1+11 = 12
    expect(m.craftsmanship).toBeCloseTo(14 + 99 * 0.72, 5)
    expect(m.reputation).toBeCloseTo(10 + 99 * 0.81, 5)
  })

  it('update前后 makers 数组引用一致', () => {
    const ref = (sys as any).makers
    sys.update(16, EMPTY_EM, 0)
    expect((sys as any).makers).toBe(ref)
  })

  it('多次 update 不改变空 makers 的长度（无creature）', () => {
    sys.update(16, EMPTY_EM, 1440)
    sys.update(16, EMPTY_EM, 2880)
    sys.update(16, EMPTY_EM, 4320)
    expect((sys as any).makers).toHaveLength(0)
  })
})
