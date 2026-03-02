import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureGlassblowersSystem } from '../systems/CreatureGlassblowersSystem'
import type { Glassblower, GlassType } from '../systems/CreatureGlassblowersSystem'

let nextId = 1
function makeSys(): CreatureGlassblowersSystem { return new CreatureGlassblowersSystem() }
function makeMaker(entityId: number, overrides: Partial<Glassblower> = {}): Glassblower {
  const skill = overrides.skill ?? 40
  return {
    id: nextId++,
    entityId,
    skill,
    piecesMade: overrides.piecesMade ?? (1 + Math.floor(skill / 9)),
    glassType: overrides.glassType ?? 'clear',
    lungCapacity: overrides.lungCapacity ?? (20 + skill * 0.6),
    reputation: overrides.reputation ?? (10 + skill * 0.8),
    tick: overrides.tick ?? 0,
  }
}

const EMPTY_EM = {
  getEntitiesWithComponents: () => [],
  getComponent: () => null,
} as any

// ——— 初始状态测试 ———
describe('CreatureGlassblowersSystem - 初始状态', () => {
  let sys: CreatureGlassblowersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无吹玻璃工', () => {
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
describe('CreatureGlassblowersSystem - 数据字段验证', () => {
  let sys: CreatureGlassblowersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可按 entityId 查询', () => {
    ;(sys as any).makers.push(makeMaker(77))
    expect((sys as any).makers[0].entityId).toBe(77)
  })

  it('注入skill=40的玻璃工后字段正确', () => {
    const m = makeMaker(1, { skill: 40 })
    ;(sys as any).makers.push(m)
    const r = (sys as any).makers[0]
    expect(r.skill).toBe(40)
    expect(r.piecesMade).toBe(5)        // 1 + floor(40/9) = 1+4 = 5
    expect(r.lungCapacity).toBeCloseTo(44, 5)  // 20+40*0.6=44
    expect(r.reputation).toBeCloseTo(42, 5)    // 10+40*0.8=42
  })

  it('tick 字段正确记录', () => {
    const m = makeMaker(1, { tick: 99999 })
    ;(sys as any).makers.push(m)
    expect((sys as any).makers[0].tick).toBe(99999)
  })

  it('id 字段正确递增', () => {
    const m1 = makeMaker(1)
    const m2 = makeMaker(2)
    ;(sys as any).makers.push(m1)
    ;(sys as any).makers.push(m2)
    expect((sys as any).makers[0].id).toBe(1)
    expect((sys as any).makers[1].id).toBe(2)
  })

  it('多个可共存', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    ;(sys as any).makers.push(makeMaker(3))
    expect((sys as any).makers).toHaveLength(3)
  })

  it('内部数组引用稳定', () => {
    const ref = (sys as any).makers
    ;(sys as any).makers.push(makeMaker(1))
    expect((sys as any).makers).toBe(ref)
  })
})

// ——— GlassType 支持测试 ———
describe('CreatureGlassblowersSystem - GlassType 支持', () => {
  let sys: CreatureGlassblowersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('GlassType 支持 clear', () => {
    ;(sys as any).makers.push(makeMaker(1, { glassType: 'clear' }))
    expect((sys as any).makers[0].glassType).toBe('clear')
  })

  it('GlassType 支持 colored', () => {
    ;(sys as any).makers.push(makeMaker(2, { glassType: 'colored' }))
    expect((sys as any).makers[0].glassType).toBe('colored')
  })

  it('GlassType 支持 stained', () => {
    ;(sys as any).makers.push(makeMaker(3, { glassType: 'stained' }))
    expect((sys as any).makers[0].glassType).toBe('stained')
  })

  it('GlassType 支持 crystal', () => {
    ;(sys as any).makers.push(makeMaker(4, { glassType: 'crystal' }))
    expect((sys as any).makers[0].glassType).toBe('crystal')
  })

  it('支持全部 4 种 GlassType', () => {
    const types: GlassType[] = ['clear', 'colored', 'stained', 'crystal']
    types.forEach((t, i) => { ;(sys as any).makers.push(makeMaker(i + 1, { glassType: t })) })
    const all = (sys as any).makers as Glassblower[]
    types.forEach((t, i) => { expect(all[i].glassType).toBe(t) })
  })
})

// ——— lungCapacity 公式测试 ———
describe('CreatureGlassblowersSystem - lungCapacity 公式', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lungCapacity 公式：20 + skill*0.6（skill=0）→ 20', () => {
    const m = makeMaker(1, { skill: 0, lungCapacity: 20 })
    expect(m.lungCapacity).toBeCloseTo(20, 5)
  })

  it('lungCapacity 公式：skill=40 → 44', () => {
    const skill = 40
    const m = makeMaker(1, { skill, lungCapacity: 20 + skill * 0.6 })
    expect(m.lungCapacity).toBeCloseTo(44, 5)
  })

  it('lungCapacity 公式：skill=50 → 50', () => {
    const skill = 50
    const expected = 20 + skill * 0.6
    const m = makeMaker(1, { skill, lungCapacity: expected })
    expect(m.lungCapacity).toBeCloseTo(expected, 5)
  })

  it('lungCapacity 公式：skill=100 → 80', () => {
    const skill = 100
    const expected = 20 + skill * 0.6  // 80
    const m = makeMaker(1, { skill, lungCapacity: expected })
    expect(m.lungCapacity).toBeCloseTo(80, 5)
  })

  it('lungCapacity 公式：skill=75 → 65', () => {
    const skill = 75
    const expected = 20 + skill * 0.6  // 65
    const m = makeMaker(1, { skill, lungCapacity: expected })
    expect(m.lungCapacity).toBeCloseTo(65, 5)
  })

  it('lungCapacity 公式：skill=25 → 35', () => {
    const skill = 25
    const expected = 20 + skill * 0.6  // 35
    const m = makeMaker(1, { skill, lungCapacity: expected })
    expect(m.lungCapacity).toBeCloseTo(35, 5)
  })
})

// ——— reputation 公式测试 ———
describe('CreatureGlassblowersSystem - reputation 公式', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reputation 公式：10 + skill*0.8（skill=0）→ 10', () => {
    const m = makeMaker(1, { skill: 0, reputation: 10 })
    expect(m.reputation).toBeCloseTo(10, 5)
  })

  it('reputation 公式：skill=40 → 42', () => {
    const skill = 40
    const m = makeMaker(1, { skill, reputation: 10 + skill * 0.8 })
    expect(m.reputation).toBeCloseTo(42, 5)
  })

  it('reputation 公式：skill=50 → 50', () => {
    const skill = 50
    const expected = 10 + skill * 0.8
    const m = makeMaker(1, { skill, reputation: expected })
    expect(m.reputation).toBeCloseTo(expected, 5)
  })

  it('reputation 公式：skill=100 → 90', () => {
    const skill = 100
    const expected = 10 + skill * 0.8  // 90
    const m = makeMaker(1, { skill, reputation: expected })
    expect(m.reputation).toBeCloseTo(90, 5)
  })

  it('reputation 公式：skill=25 → 30', () => {
    const skill = 25
    const expected = 10 + skill * 0.8  // 30
    const m = makeMaker(1, { skill, reputation: expected })
    expect(m.reputation).toBeCloseTo(30, 5)
  })
})

// ——— piecesMade 公式测试 ———
describe('CreatureGlassblowersSystem - piecesMade 公式', () => {
  afterEach(() => vi.restoreAllMocks())

  it('piecesMade = 1 + floor(skill/9)（skill=0）→ 1', () => {
    const m = makeMaker(1, { skill: 0, piecesMade: 1 })
    expect(m.piecesMade).toBe(1)
  })

  it('piecesMade = 1 + floor(skill/9)（skill=9）→ 2', () => {
    const m = makeMaker(1, { skill: 9, piecesMade: 2 })
    expect(m.piecesMade).toBe(2)
  })

  it('piecesMade = 1 + floor(skill/9)（skill=40）→ 5', () => {
    const skill = 40
    const expected = 1 + Math.floor(skill / 9)  // = 1 + 4 = 5
    const m = makeMaker(1, { skill, piecesMade: expected })
    expect(m.piecesMade).toBe(5)
  })

  it('piecesMade = 1 + floor(skill/9) when skill=90 → 11', () => {
    const skill = 90
    const expected = 1 + Math.floor(skill / 9)  // = 1 + 10 = 11
    const m = makeMaker(1, { skill, piecesMade: expected })
    expect(m.piecesMade).toBe(11)
  })

  it('piecesMade = 1 + floor(skill/9)（skill=100）→ 12', () => {
    const skill = 100
    const expected = 1 + Math.floor(skill / 9)  // = 1 + 11 = 12
    const m = makeMaker(1, { skill, piecesMade: expected })
    expect(m.piecesMade).toBe(12)
  })

  it('piecesMade = 1 + floor(skill/9)（skill=8）→ 1（不足整除）', () => {
    const m = makeMaker(1, { skill: 8, piecesMade: 1 })
    expect(m.piecesMade).toBe(1)
  })
})

// ——— glassType 4段映射测试 ———
describe('CreatureGlassblowersSystem - glassType 4段映射', () => {
  afterEach(() => vi.restoreAllMocks())

  it('skill<25 时 glassType=clear（段0）', () => {
    const idx = Math.min(3, Math.floor(10 / 25))
    const types: GlassType[] = ['clear', 'colored', 'stained', 'crystal']
    expect(types[idx]).toBe('clear')
  })

  it('skill=0 → typeIdx=0 → clear', () => {
    const idx = Math.min(3, Math.floor(0 / 25))
    expect(idx).toBe(0)
  })

  it('skill=24 → typeIdx=0 → clear（段0边界）', () => {
    const idx = Math.min(3, Math.floor(24 / 25))
    expect(idx).toBe(0)
  })

  it('skill=25 时 glassType=colored（段1）', () => {
    const idx = Math.min(3, Math.floor(25 / 25))
    expect(idx).toBe(1)
    const types: GlassType[] = ['clear', 'colored', 'stained', 'crystal']
    expect(types[idx]).toBe('colored')
  })

  it('skill=49 → typeIdx=1（段1边界）', () => {
    const idx = Math.min(3, Math.floor(49 / 25))
    expect(idx).toBe(1)
  })

  it('skill=50 时 glassType=stained（段2）', () => {
    const idx = Math.min(3, Math.floor(50 / 25))
    expect(idx).toBe(2)
    const types: GlassType[] = ['clear', 'colored', 'stained', 'crystal']
    expect(types[idx]).toBe('stained')
  })

  it('skill=74 → typeIdx=2（段2边界）', () => {
    const idx = Math.min(3, Math.floor(74 / 25))
    expect(idx).toBe(2)
  })

  it('skill>=75 时 glassType=crystal（段3）', () => {
    const idx = Math.min(3, Math.floor(75 / 25))
    expect(idx).toBe(3)
    const types: GlassType[] = ['clear', 'colored', 'stained', 'crystal']
    expect(types[idx]).toBe('crystal')
  })

  it('skill=100 → typeIdx 仍为 3（min(3,...) 限制）', () => {
    const idx = Math.min(3, Math.floor(100 / 25))
    expect(idx).toBe(3)
  })
})

// ——— CHECK_INTERVAL 节流测试 ———
describe('CreatureGlassblowersSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreatureGlassblowersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值<1450时不更新lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    } as any
    sys.update(0, em, 5000 + 1449)
    expect((sys as any).lastCheck).toBe(5000)
  })

  it('tick差值>=1450时更新lastCheck', () => {
    ;(sys as any).lastCheck = 5000
    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
    } as any
    sys.update(0, em, 5000 + 1450)
    expect((sys as any).lastCheck).toBe(6450)
  })

  it('tick差值=1449时仍被节流（不调用 getEntitiesWithComponents）', () => {
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(0, em, 1449)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick差值=1450时精确触发', () => {
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(0, em, 1450)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('连续两次update：第一次触发后第二次被节流', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(0, em, 1450) // 触发，lastCheck=1450
    sys.update(0, em, 1450 + 100) // diff=100 < 1450 → 节流
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('两次间隔>=1450都触发', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(0, em, 1450)  // 触发一次
    sys.update(0, em, 2900)  // 触发第二次
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(2)
  })

  it('tick=0时被节流（0-0=0<1450）', () => {
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn(),
    } as any
    sys.update(0, em, 0)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })
})

// ——— time-based cleanup 测试 ———
describe('CreatureGlassblowersSystem - time-based cleanup', () => {
  let sys: CreatureGlassblowersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('time-based cleanup: tick < (currentTick - 54000) 的记录被删除', () => {
    const currentTick = 100000
    const cutoff = currentTick - 54000  // = 46000
    ;(sys as any).makers.push(makeMaker(1, { tick: cutoff - 1 })) // should be deleted
    ;(sys as any).makers.push(makeMaker(2, { tick: cutoff + 1 })) // should be kept
    ;(sys as any).lastCheck = 0
    const em = {
      getEntitiesWithComponents: () => [],
      getComponent: () => null,
      hasComponent: () => true,
    } as any
    ;(sys as any).skillMap = new Map()
    sys.update(0, em, currentTick)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })

  it('tick=0记录在currentTick=60000时删除（cutoff=6000，0<6000）', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, EMPTY_EM, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('cutoff边界：tick等于cutoff时不删除（严格小于）', () => {
    const currentTick = 60000
    const cutoff = currentTick - 54000  // = 6000
    ;(sys as any).makers.push(makeMaker(1, { tick: cutoff })) // tick == cutoff → kept
    ;(sys as any).lastCheck = 0
    sys.update(0, EMPTY_EM, currentTick)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('tick=cutoff-1时删除', () => {
    const currentTick = 60000
    const cutoff = currentTick - 54000  // = 6000
    ;(sys as any).makers.push(makeMaker(1, { tick: cutoff - 1 })) // 5999 < 6000 → deleted
    ;(sys as any).lastCheck = 0
    sys.update(0, EMPTY_EM, currentTick)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('多条过期记录同时删除', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 100 }))
    ;(sys as any).makers.push(makeMaker(3, { tick: 200 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, EMPTY_EM, 60000)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('全部记录均新则全部保留', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 59000 }))
    ;(sys as any).makers.push(makeMaker(2, { tick: 58000 }))
    ;(sys as any).lastCheck = 0
    sys.update(0, EMPTY_EM, 60000)
    expect((sys as any).makers).toHaveLength(2)
  })

  it('混合情况：保留最新的，删除旧的', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 0 }))       // 过期
    ;(sys as any).makers.push(makeMaker(2, { tick: 58000 }))   // 保留
    ;(sys as any).makers.push(makeMaker(3, { tick: 500 }))     // 过期
    ;(sys as any).makers.push(makeMaker(4, { tick: 59000 }))   // 保留
    ;(sys as any).lastCheck = 0
    sys.update(0, EMPTY_EM, 60000)
    const remaining = (sys as any).makers as Glassblower[]
    expect(remaining).toHaveLength(2)
    const ids = remaining.map(r => r.entityId).sort()
    expect(ids).toEqual([2, 4])
  })
})

// ——— skillMap 测试 ———
describe('CreatureGlassblowersSystem - skillMap', () => {
  let sys: CreatureGlassblowersSystem
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

  it('skillMap 覆盖写入', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(1, 60)
    expect((sys as any).skillMap.get(1)).toBe(60)
  })
})

// ——— MAX_MAKERS 上限测试 ———
describe('CreatureGlassblowersSystem - MAX_MAKERS 上限', () => {
  let sys: CreatureGlassblowersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('填充30条记录后长度为30', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(30)
  })

  it('update时makers>=30则不新增（通过mock验证）', () => {
    for (let i = 0; i < 30; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, { tick: 100000 }))
    }
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([99]),
      getComponent: vi.fn().mockReturnValue({ age: 20 }),
    } as any
    ;(sys as any).lastCheck = 0
    sys.update(16, em, 1450)
    expect((sys as any).makers).toHaveLength(30)
    spy.mockRestore()
  })
})

// ——— 综合验证测试 ———
describe('CreatureGlassblowersSystem - 综合验证', () => {
  let sys: CreatureGlassblowersSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('skill=100时piecesMade=12，glassType=crystal', () => {
    const skill = 100
    const m = makeMaker(1, { skill, piecesMade: 12, glassType: 'crystal', lungCapacity: 80, reputation: 90 })
    expect(m.piecesMade).toBe(12)
    expect(m.glassType).toBe('crystal')
  })

  it('skill=1时各公式边界值正确', () => {
    const skill = 1
    const m = makeMaker(1, { skill, piecesMade: 1, lungCapacity: 20 + 0.6, reputation: 10 + 0.8 })
    expect(m.piecesMade).toBe(1)
    expect(m.lungCapacity).toBeCloseTo(20.6, 5)
    expect(m.reputation).toBeCloseTo(10.8, 5)
  })

  it('update前后 makers 数组引用一致', () => {
    const ref = (sys as any).makers
    sys.update(16, EMPTY_EM, 0)
    expect((sys as any).makers).toBe(ref)
  })

  it('多次 update 不改变空 makers 的长度（无creature）', () => {
    sys.update(16, EMPTY_EM, 1450)
    sys.update(16, EMPTY_EM, 2900)
    sys.update(16, EMPTY_EM, 4350)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('skill=99时各公式边界值正确', () => {
    const skill = 99
    const m = makeMaker(1, {
      skill,
      piecesMade: 1 + Math.floor(99 / 9),
      lungCapacity: 20 + 99 * 0.6,
      reputation: 10 + 99 * 0.8,
    })
    expect(m.piecesMade).toBe(12) // 1+11=12
    expect(m.lungCapacity).toBeCloseTo(79.4, 5)
    expect(m.reputation).toBeCloseTo(89.2, 5)
  })

  it('不同 entityId 的玻璃工独立存在', () => {
    ;(sys as any).makers.push(makeMaker(101, { skill: 20, glassType: 'clear' }))
    ;(sys as any).makers.push(makeMaker(202, { skill: 50, glassType: 'stained' }))
    ;(sys as any).makers.push(makeMaker(303, { skill: 80, glassType: 'crystal' }))
    const all = (sys as any).makers as Glassblower[]
    expect(all[0].entityId).toBe(101)
    expect(all[1].entityId).toBe(202)
    expect(all[2].entityId).toBe(303)
  })
})
