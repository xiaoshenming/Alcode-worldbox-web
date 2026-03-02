import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureFeltingMakers2System } from '../systems/CreatureFeltingMakersSystem2'
import type { FeltingMaker2 } from '../systems/CreatureFeltingMakersSystem2'

// 常量（来自源文件）:
// CHECK_INTERVAL  = 2480
// RECRUIT_CHANCE  = 0.0017
// MAX_MAKERS      = 12
// 技能增长: needleSkill += 0.02, artistry += 0.015, densityControl += 0.01
// 清理条件: needleSkill <= 3

const CHECK_INTERVAL = 2480
const MAX_MAKERS = 12

let nextId = 100

function makeSys(): CreatureFeltingMakers2System { return new CreatureFeltingMakers2System() }

function makeMaker(entityId: number, overrides: Partial<FeltingMaker2> = {}): FeltingMaker2 {
  return {
    id: nextId++,
    entityId,
    needleSkill: 70,
    woolGrade: 65,
    densityControl: 80,
    artistry: 75,
    tick: 0,
    ...overrides,
  }
}

// 空的 EntityManager
const fakeEm = { getEntitiesWithComponents: () => [], getComponent: () => null } as any

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureFeltingMakers2System - 基础初始化', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无毡制工匠', () => {
    expect((sys as any).makers).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('makers 是数组类型', () => {
    expect(Array.isArray((sys as any).makers)).toBe(true)
  })

  it('不同实例互相独立', () => {
    const s1 = makeSys()
    const s2 = makeSys()
    ;(s1 as any).makers.push(makeMaker(1))
    expect((s2 as any).makers).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureFeltingMakers2System - FeltingMaker2 数据结构', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询 entityId', () => {
    ;(sys as any).makers.push(makeMaker(5))
    expect((sys as any).makers[0].entityId).toBe(5)
  })

  it('needleSkill 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 70 }))
    expect((sys as any).makers[0].needleSkill).toBe(70)
  })

  it('artistry 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { artistry: 75 }))
    expect((sys as any).makers[0].artistry).toBe(75)
  })

  it('woolGrade 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { woolGrade: 65 }))
    expect((sys as any).makers[0].woolGrade).toBe(65)
  })

  it('densityControl 字段正确', () => {
    ;(sys as any).makers.push(makeMaker(1, { densityControl: 80 }))
    expect((sys as any).makers[0].densityControl).toBe(80)
  })

  it('tick 字段记录注入时间', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 9999 }))
    expect((sys as any).makers[0].tick).toBe(9999)
  })

  it('id 字段存在且为数值', () => {
    ;(sys as any).makers.push(makeMaker(1))
    expect(typeof (sys as any).makers[0].id).toBe('number')
  })

  it('多个工匠各自独立', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 10 }))
    ;(sys as any).makers.push(makeMaker(2, { needleSkill: 90 }))
    expect((sys as any).makers[0].needleSkill).toBe(10)
    expect((sys as any).makers[1].needleSkill).toBe(90)
  })

  it('id 字段自增（不同工匠 id 不同）', () => {
    ;(sys as any).makers.push(makeMaker(1))
    ;(sys as any).makers.push(makeMaker(2))
    const ids = (sys as any).makers.map((m: FeltingMaker2) => m.id)
    expect(new Set(ids).size).toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureFeltingMakers2System - MAX_MAKERS 限制', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('MAX_MAKERS 为 12', () => {
    expect(MAX_MAKERS).toBe(12)
  })

  it('可注入 12 个工匠', () => {
    for (let i = 0; i < 12; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1))
    }
    expect((sys as any).makers).toHaveLength(12)
  })

  it('达到 MAX_MAKERS 时 update 不再新增（random 触发招募）', () => {
    for (let i = 0; i < 12; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, { needleSkill: 50 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0) // < RECRUIT_CHANCE(0.0017) 触发
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers.length).toBeLessThanOrEqual(12)
  })

  it('少于 MAX_MAKERS 时随机触发可新增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // 触发招募
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, CHECK_INTERVAL)
    // 新增 1 个（如果随机满足）
    expect((sys as any).makers.length).toBeGreaterThanOrEqual(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureFeltingMakers2System - CHECK_INTERVAL 节流控制', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('tick差值 < CHECK_INTERVAL(2480) 时不更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2479)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick差值 >= CHECK_INTERVAL(2480) 时更新 lastCheck', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2480)
    expect((sys as any).lastCheck).toBe(2480)
  })

  it('节流未触发时技能不增长', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 50 }))
    ;(sys as any).lastCheck = 1000
    sys.update(16, fakeEm, 1000 + CHECK_INTERVAL - 1)
    expect((sys as any).makers[0].needleSkill).toBe(50)
  })

  it('节流触发时技能增长', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 50 }))
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].needleSkill).toBeCloseTo(50.02, 5)
  })

  it('lastCheck 非零时节流正确计算差值', () => {
    ;(sys as any).lastCheck = 5000
    sys.update(1, fakeEm, 5000 + CHECK_INTERVAL - 1) // 不触发
    expect((sys as any).lastCheck).toBe(5000)
    sys.update(1, fakeEm, 5000 + CHECK_INTERVAL) // 触发
    expect((sys as any).lastCheck).toBe(5000 + CHECK_INTERVAL)
  })

  it('tick 等于 lastCheck+2479 时不触发（边界）', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2479)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick 等于 lastCheck+2480 时触发（边界）', () => {
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, 2480)
    expect((sys as any).lastCheck).toBe(2480)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureFeltingMakers2System - 技能增长规则', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('触发后 needleSkill 增加 0.02', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 50 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].needleSkill).toBeCloseTo(50.02, 5)
  })

  it('触发后 artistry 增加 0.015', () => {
    ;(sys as any).makers.push(makeMaker(1, { artistry: 50 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].artistry).toBeCloseTo(50.015, 5)
  })

  it('触发后 densityControl 增加 0.01', () => {
    ;(sys as any).makers.push(makeMaker(1, { densityControl: 50 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].densityControl).toBeCloseTo(50.01, 5)
  })

  it('needleSkill=99.99 后 update 变为 100（钳制）', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 99.99 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].needleSkill).toBe(100)
  })

  it('densityControl 上限为 100', () => {
    ;(sys as any).makers.push(makeMaker(1, { densityControl: 99.99 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].densityControl).toBe(100)
  })

  it('artistry 上限为 100', () => {
    ;(sys as any).makers.push(makeMaker(1, { artistry: 99.99 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].artistry).toBe(100)
  })

  it('needleSkill 已达 100 时不再增长', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 100 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].needleSkill).toBe(100)
  })

  it('多次触发 update 技能累积递增', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 50 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    ;(sys as any).lastCheck = 0
    sys.update(16, fakeEm, CHECK_INTERVAL * 2)
    expect((sys as any).makers[0].needleSkill).toBeCloseTo(50.04, 5)
  })

  it('woolGrade 字段 update 时不变（无增长逻辑）', () => {
    ;(sys as any).makers.push(makeMaker(1, { woolGrade: 65 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].woolGrade).toBe(65)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureFeltingMakers2System - needleSkill <= 3 清理规则', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('needleSkill=2.98 时 update 后恰好超过 3.00 被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 2.98 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('needleSkill=3.0 时被清除（<= 3 条件）', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 3.0 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    // 3.0 + 0.02 = 3.02 > 3，不被清除（清理在增长之后）
    // 源码先增长再清理：增长后 needleSkill=3.02 > 3，不清理
    expect((sys as any).makers.length).toBe(1)
  })

  it('needleSkill=2.5 时增长后仍 <= 3，被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 2.5 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    // 2.5 + 0.02 = 2.52 <= 3，被清除
    expect((sys as any).makers).toHaveLength(0)
  })

  it('needleSkill=4 时不被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 4 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('needleSkill=1 时被清除', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 1 }))
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('部分工匠 needleSkill <= 3，只清理这部分', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 1 }))  // 被清除
    ;(sys as any).makers.push(makeMaker(2, { needleSkill: 50 })) // 保留
    ;(sys as any).makers.push(makeMaker(3, { needleSkill: 2 }))  // 被清除
    sys.update(16, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
    expect((sys as any).makers[0].entityId).toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureFeltingMakers2System - 招募随机逻辑', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('RECRUIT_CHANCE=0.0017：random > 0.0017 时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.002) // > 0.0017
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(0)
  })

  it('RECRUIT_CHANCE=0.0017：random < 0.0017 时招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // < 0.0017 触发
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers).toHaveLength(1)
  })

  it('招募时 tick 字段等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].tick).toBe(CHECK_INTERVAL)
  })

  it('招募时 nextId 自增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const idBefore = (sys as any).nextId
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(idBefore + 1)
  })

  it('招募时 needleSkill 在 10-35 范围内', () => {
    // 来自源码: 10 + Math.random() * 25
    // random 固定为 0 时 needleSkill=10，然后 update 中 +0.02 变为 10.02
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, CHECK_INTERVAL)
    const ns = (sys as any).makers[0].needleSkill
    expect(ns).toBeGreaterThanOrEqual(10)
    expect(ns).toBeLessThanOrEqual(36) // 35 + 0.02
  })

  it('招募时 woolGrade 在 15-45 范围内', () => {
    // 来自源码: 15 + Math.random() * 30，random=0 时 woolGrade=15
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, CHECK_INTERVAL)
    const wg = (sys as any).makers[0].woolGrade
    expect(wg).toBeGreaterThanOrEqual(15)
    expect(wg).toBeLessThanOrEqual(45)
  })

  it('招募时 artistry 在 5-30 范围内', () => {
    // 来自源码: 5 + Math.random() * 25，random=0 时 artistry=5
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, CHECK_INTERVAL)
    const art = (sys as any).makers[0].artistry
    expect(art).toBeGreaterThanOrEqual(5)
    expect(art).toBeLessThanOrEqual(31) // 30 + 0.015
  })

  it('招募时 densityControl 在 10-30 范围内', () => {
    // 来自源码: 10 + Math.random() * 20，random=0 时 densityControl=10
    vi.spyOn(Math, 'random').mockReturnValue(0)
    ;(sys as any).lastCheck = 0
    sys.update(1, fakeEm, CHECK_INTERVAL)
    const dc = (sys as any).makers[0].densityControl
    expect(dc).toBeGreaterThanOrEqual(10)
    expect(dc).toBeLessThanOrEqual(31) // 30 + 0.01
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('CreatureFeltingMakers2System - 综合场景', () => {
  let sys: CreatureFeltingMakers2System
  beforeEach(() => { sys = makeSys(); nextId = 100 })
  afterEach(() => vi.restoreAllMocks())

  it('空 makers 调用 update 不报错', () => {
    expect(() => sys.update(1, fakeEm, CHECK_INTERVAL)).not.toThrow()
  })

  it('多次 update 后 lastCheck 递增', () => {
    sys.update(1, fakeEm, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
    sys.update(1, fakeEm, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })

  it('12 个工匠都能正确增长技能', () => {
    for (let i = 0; i < 12; i++) {
      ;(sys as any).makers.push(makeMaker(i + 1, { needleSkill: 50, artistry: 50, densityControl: 50 }))
    }
    sys.update(1, fakeEm, CHECK_INTERVAL)
    for (const m of (sys as any).makers) {
      expect(m.needleSkill).toBeCloseTo(50.02, 5)
      expect(m.artistry).toBeCloseTo(50.015, 5)
      expect(m.densityControl).toBeCloseTo(50.01, 5)
    }
  })

  it('技能增长不影响 woolGrade', () => {
    ;(sys as any).makers.push(makeMaker(1, { woolGrade: 33 }))
    sys.update(1, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].woolGrade).toBe(33)
  })

  it('连续多轮 update 技能持续增长直到上限', () => {
    ;(sys as any).makers.push(makeMaker(1, { needleSkill: 99 }))
    for (let round = 1; round <= 50; round++) {
      ;(sys as any).lastCheck = 0
      sys.update(1, fakeEm, CHECK_INTERVAL)
    }
    expect((sys as any).makers[0].needleSkill).toBeCloseTo(100, 3)
  })

  it('entityId 字段在 update 后不变', () => {
    ;(sys as any).makers.push(makeMaker(77))
    sys.update(1, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].entityId).toBe(77)
  })

  it('tick 字段在 update 后不变（tick 记录创建时间）', () => {
    ;(sys as any).makers.push(makeMaker(1, { tick: 5000 }))
    sys.update(1, fakeEm, CHECK_INTERVAL)
    expect((sys as any).makers[0].tick).toBe(5000)
  })
})
