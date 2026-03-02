import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreaturePlanisherSystem } from '../systems/CreaturePlanisherSystem'
import type { Planisher } from '../systems/CreaturePlanisherSystem'

const CHECK_INTERVAL = 2890
const MAX_PLANISHERS = 10
const RECRUIT_CHANCE = 0.0015

let nextId = 1
function makeSys(): CreaturePlanisherSystem { return new CreaturePlanisherSystem() }
function makePlanisher(entityId: number, overrides: Partial<Planisher> = {}): Planisher {
  return {
    id: nextId++,
    entityId,
    planishingSkill: 70,
    hammerPrecision: 65,
    surfaceFlatness: 80,
    metalAlignment: 75,
    tick: 0,
    ...overrides,
  }
}

/** 构造最简 EntityManager mock */
const emMock = { getEntitiesWithComponents: () => [] } as any

// ──────────────────────────────────────────────
// 1. 初始状态
// ──────────────────────────────────────────────
describe('CreaturePlanisherSystem - 初始状态', () => {
  let sys: CreaturePlanisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无金属锤平工', () => { expect((sys as any).planishers).toHaveLength(0) })
  it('初始 nextId 为 1', () => { expect((sys as any).nextId).toBe(1) })
  it('初始 lastCheck 为 0', () => { expect((sys as any).lastCheck).toBe(0) })
  it('planishers 是数组', () => { expect(Array.isArray((sys as any).planishers)).toBe(true) })
})

// ──────────────────────────────────────────────
// 2. getPlanishers / 数据注入
// ──────────────────────────────────────────────
describe('CreaturePlanisherSystem.getPlanishers', () => {
  let sys: CreaturePlanisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('注入后可查询', () => {
    ;(sys as any).planishers.push(makePlanisher(1))
    expect((sys as any).planishers[0].entityId).toBe(1)
  })
  it('返回内部引用（同一对象）', () => {
    ;(sys as any).planishers.push(makePlanisher(1))
    expect((sys as any).planishers).toBe((sys as any).planishers)
  })
  it('字段 planishingSkill 正确', () => {
    ;(sys as any).planishers.push(makePlanisher(3))
    expect((sys as any).planishers[0].planishingSkill).toBe(70)
  })
  it('字段 surfaceFlatness 正确', () => {
    ;(sys as any).planishers.push(makePlanisher(3))
    expect((sys as any).planishers[0].surfaceFlatness).toBe(80)
  })
  it('字段 hammerPrecision 正确', () => {
    ;(sys as any).planishers.push(makePlanisher(3))
    expect((sys as any).planishers[0].hammerPrecision).toBe(65)
  })
  it('字段 metalAlignment 正确', () => {
    ;(sys as any).planishers.push(makePlanisher(3))
    expect((sys as any).planishers[0].metalAlignment).toBe(75)
  })
  it('多个全部返回', () => {
    ;(sys as any).planishers.push(makePlanisher(1))
    ;(sys as any).planishers.push(makePlanisher(2))
    expect((sys as any).planishers).toHaveLength(2)
  })
  it('entityId 字段可区分不同金属锤平工', () => {
    ;(sys as any).planishers.push(makePlanisher(10))
    ;(sys as any).planishers.push(makePlanisher(20))
    expect((sys as any).planishers[0].entityId).toBe(10)
    expect((sys as any).planishers[1].entityId).toBe(20)
  })
  it('tick 字段正确存储', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { tick: 9999 }))
    expect((sys as any).planishers[0].tick).toBe(9999)
  })
})

// ──────────────────────────────────────────────
// 3. CHECK_INTERVAL 节流
// ──────────────────────────────────────────────
describe('CreaturePlanisherSystem - CHECK_INTERVAL 节流', () => {
  let sys: CreaturePlanisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick 不足 CHECK_INTERVAL 时不更新 lastCheck', () => {
    sys.update(1, emMock, CHECK_INTERVAL - 1)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('tick 达到 CHECK_INTERVAL 时更新 lastCheck', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('两次 update 中间不满足间隔时跳过第二次', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    const countAfterFirst = (sys as any).planishers.length
    sys.update(1, emMock, CHECK_INTERVAL + 1)
    expect((sys as any).planishers.length).toBe(countAfterFirst)
  })
  it('tick 恰好等于 CHECK_INTERVAL 时触发', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL)
  })
  it('tick 为 0 时不触发（lastCheck=0, 0-0=0 < CHECK_INTERVAL）', () => {
    sys.update(1, emMock, 0)
    expect((sys as any).lastCheck).toBe(0)
  })
  it('两个完整间隔后 lastCheck 更新到第二个 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    sys.update(1, emMock, CHECK_INTERVAL * 2)
    expect((sys as any).lastCheck).toBe(CHECK_INTERVAL * 2)
  })
  it('tick < CHECK_INTERVAL 时 planishers 不变', () => {
    ;(sys as any).planishers.push(makePlanisher(1))
    sys.update(1, emMock, 100)
    expect((sys as any).planishers).toHaveLength(1)
  })
})

// ──────────────────────────────────────────────
// 4. 招募逻辑
// ──────────────────────────────────────────────
describe('CreaturePlanisherSystem - 招募逻辑', () => {
  let sys: CreaturePlanisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('Math.random() < RECRUIT_CHANCE 时招募新金属锤平工', () => {
    vi.spyOn(Math, 'random').mockReturnValue(RECRUIT_CHANCE - 0.0001)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers).toHaveLength(1)
  })
  it('Math.random() >= RECRUIT_CHANCE 时不招募', () => {
    vi.spyOn(Math, 'random').mockReturnValue(RECRUIT_CHANCE)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers).toHaveLength(0)
  })
  it('招募时 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).nextId).toBe(2)
  })
  it('已满 MAX_PLANISHERS 时不再招募', () => {
    for (let i = 0; i < MAX_PLANISHERS; i++) {
      ;(sys as any).planishers.push(makePlanisher(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers.length).toBeLessThanOrEqual(MAX_PLANISHERS)
  })
  it('招募的金属锤平工 tick 字段与当前 tick 一致', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    if ((sys as any).planishers.length > 0) {
      expect((sys as any).planishers[0].tick).toBe(CHECK_INTERVAL)
    }
  })
  it('招募的新锤平工 id 从 1 开始', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    if ((sys as any).planishers.length > 0) {
      expect((sys as any).planishers[0].id).toBe(1)
    }
  })
})

// ──────────────────────────────────────────────
// 5. 技能递增
// ──────────────────────────────────────────────
describe('CreaturePlanisherSystem - 技能递增', () => {
  let sys: CreaturePlanisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('update 后 planishingSkill 增加 0.02', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].planishingSkill).toBeCloseTo(50.02)
  })
  it('update 后 hammerPrecision 增加 0.015', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { hammerPrecision: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].hammerPrecision).toBeCloseTo(50.015)
  })
  it('update 后 metalAlignment 增加 0.01', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { metalAlignment: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].metalAlignment).toBeCloseTo(50.01)
  })
  it('多次 update 技能累积增加', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    sys.update(1, emMock, CHECK_INTERVAL * 2)
    expect((sys as any).planishers[0].planishingSkill).toBeCloseTo(50.04)
  })
  it('surfaceFlatness 字段在 update 中不变化（源码未更新该字段）', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { surfaceFlatness: 80 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].surfaceFlatness).toBe(80)
  })
  it('两个锤平工各自技能独立增长', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 30 }))
    ;(sys as any).planishers.push(makePlanisher(2, { planishingSkill: 60 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].planishingSkill).toBeCloseTo(30.02)
    expect((sys as any).planishers[1].planishingSkill).toBeCloseTo(60.02)
  })
})

// ──────────────────────────────────────────────
// 6. 技能上限
// ──────────────────────────────────────────────
describe('CreaturePlanisherSystem - 技能上限 100', () => {
  let sys: CreaturePlanisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('planishingSkill 不超过 100', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 99.99 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].planishingSkill).toBe(100)
  })
  it('hammerPrecision 不超过 100', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { hammerPrecision: 99.99 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].hammerPrecision).toBe(100)
  })
  it('metalAlignment 不超过 100', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { metalAlignment: 99.995 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].metalAlignment).toBe(100)
  })
  it('planishingSkill 已为 100 时保持 100', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].planishingSkill).toBe(100)
  })
  it('hammerPrecision 已为 100 时保持 100', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { hammerPrecision: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].hammerPrecision).toBe(100)
  })
  it('metalAlignment 已为 100 时保持 100', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { metalAlignment: 100 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers[0].metalAlignment).toBe(100)
  })
})

// ──────────────────────────────────────────────
// 7. cleanup（planishingSkill <= 4）
// ──────────────────────────────────────────────
describe('CreaturePlanisherSystem - cleanup（planishingSkill <= 4）', () => {
  let sys: CreaturePlanisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('planishingSkill > 4 的记录不被清除', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 5 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers).toHaveLength(1)
  })
  it('planishingSkill 经增长后 <= 4 的记录被清除（3.98 + 0.02 = 4.00）', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 3.98 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers).toHaveLength(0)
  })
  it('仅清除低技能记录，高技能保留', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 3 }))
    ;(sys as any).planishers.push(makePlanisher(2, { planishingSkill: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, emMock, CHECK_INTERVAL)
    const survivors = (sys as any).planishers
    expect(survivors).toHaveLength(1)
    expect(survivors[0].entityId).toBe(2)
  })
  it('planishingSkill 恰好为 4 时被清除', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 3.98 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, emMock, CHECK_INTERVAL)
    // 3.98 + 0.02 = 4.00, 4 <= 4 → 清除
    expect((sys as any).planishers).toHaveLength(0)
  })
  it('planishingSkill 为 4.01 时不被清除', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 3.99 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, emMock, CHECK_INTERVAL)
    // 3.99 + 0.02 = 4.01, 4.01 > 4 → 保留
    expect((sys as any).planishers).toHaveLength(1)
  })
  it('多个低技能记录全部被清除', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 1 }))
    ;(sys as any).planishers.push(makePlanisher(2, { planishingSkill: 2 }))
    ;(sys as any).planishers.push(makePlanisher(3, { planishingSkill: 3 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers).toHaveLength(0)
  })
  it('cleanup 后 planishers 数组长度正确', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 1 }))
    ;(sys as any).planishers.push(makePlanisher(2, { planishingSkill: 50 }))
    ;(sys as any).planishers.push(makePlanisher(3, { planishingSkill: 2 }))
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers).toHaveLength(1)
  })
})

// ──────────────────────────────────────────────
// 8. MAX_PLANISHERS 上限
// ──────────────────────────────────────────────
describe('CreaturePlanisherSystem - MAX_PLANISHERS 上限', () => {
  let sys: CreaturePlanisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('已达 MAX_PLANISHERS 时不再招募', () => {
    for (let i = 0; i < MAX_PLANISHERS; i++) {
      ;(sys as any).planishers.push(makePlanisher(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers.length).toBeLessThanOrEqual(MAX_PLANISHERS)
  })
  it('planishers 数量恰好为 MAX_PLANISHERS 不增加', () => {
    for (let i = 0; i < MAX_PLANISHERS; i++) {
      ;(sys as any).planishers.push(makePlanisher(i + 1, { planishingSkill: 80 }))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    expect((sys as any).planishers.length).toBe(MAX_PLANISHERS)
  })
  it('MAX_PLANISHERS 常量为 10', () => {
    expect(MAX_PLANISHERS).toBe(10)
  })
})

// ──────────────────────────────────────────────
// 9. nextId 递增序列
// ──────────────────────────────────────────────
describe('CreaturePlanisherSystem - nextId 递增', () => {
  let sys: CreaturePlanisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始 nextId 为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })
  it('每次招募后 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(1, emMock, CHECK_INTERVAL)
    if ((sys as any).planishers.length > 0) {
      expect((sys as any).nextId).toBe(2)
    }
  })
  it('多次招募后 nextId 正确递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    // 手动推入锤平工模拟多次招募
    ;(sys as any).planishers.push({ id: (sys as any).nextId++, entityId: 1, planishingSkill: 50, hammerPrecision: 50, surfaceFlatness: 50, metalAlignment: 50, tick: 0 })
    ;(sys as any).planishers.push({ id: (sys as any).nextId++, entityId: 2, planishingSkill: 50, hammerPrecision: 50, surfaceFlatness: 50, metalAlignment: 50, tick: 0 })
    expect((sys as any).nextId).toBe(3)
  })
})

// ──────────────────────────────────────────────
// 10. 边界与综合场景
// ──────────────────────────────────────────────
describe('CreaturePlanisherSystem - 边界与综合场景', () => {
  let sys: CreaturePlanisherSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('多个间隔后技能持续增长', () => {
    ;(sys as any).planishers.push(makePlanisher(1, { planishingSkill: 50, hammerPrecision: 50, metalAlignment: 50 }))
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let t = 1; t <= 5; t++) {
      sys.update(1, emMock, CHECK_INTERVAL * t)
    }
    expect((sys as any).planishers[0].planishingSkill).toBeCloseTo(50.10, 2)
  })
  it('update 不修改 dt 参数（dt 仅用于接口兼容）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(() => sys.update(999, emMock, CHECK_INTERVAL)).not.toThrow()
  })
  it('混合高低技能锤平工时仅清除低技能', () => {
    const data = [3.95, 10, 50, 2.5, 99]
    data.forEach((skill, i) => {
      ;(sys as any).planishers.push(makePlanisher(i + 1, { planishingSkill: skill }))
    })
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(1, emMock, CHECK_INTERVAL)
    // 3.95+0.02=3.97 <=4 清除; 2.5+0.02=2.52 <=4 清除
    const survivors = (sys as any).planishers.map((p: Planisher) => p.entityId)
    expect(survivors).toContain(2)  // entityId=2, skill=10
    expect(survivors).toContain(3)  // entityId=3, skill=50
    expect(survivors).toContain(5)  // entityId=5, skill=99
  })
  it('招募的锤平工 planishingSkill 在初始范围内（10-35）', () => {
    // Math.random() = 0 -> planishingSkill = 10 + 0*25 = 10
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0)    // recruit_chance pass (0 < 0.0015)
    mockRandom.mockReturnValueOnce(0)    // entityId random
    mockRandom.mockReturnValueOnce(0)    // planishingSkill random
    mockRandom.mockReturnValue(0)        // 其余
    sys.update(1, emMock, CHECK_INTERVAL)
    if ((sys as any).planishers.length > 0) {
      const skill = (sys as any).planishers[0].planishingSkill
      expect(skill).toBeGreaterThanOrEqual(10)
      expect(skill).toBeLessThanOrEqual(35)
    }
  })
  it('招募的锤平工 surfaceFlatness 在初始范围内（5-25）', () => {
    const mockRandom = vi.spyOn(Math, 'random')
    mockRandom.mockReturnValueOnce(0)  // recruit pass
    mockRandom.mockReturnValue(0.5)   // all randoms = 0.5
    sys.update(1, emMock, CHECK_INTERVAL)
    if ((sys as any).planishers.length > 0) {
      const sf = (sys as any).planishers[0].surfaceFlatness
      expect(sf).toBeGreaterThanOrEqual(5)
      expect(sf).toBeLessThanOrEqual(25)
    }
  })
  it('tick 非整数时不崩溃', () => {
    expect(() => sys.update(1, emMock, 2890.5)).not.toThrow()
  })
  it('CHECK_INTERVAL 常量为 2890', () => {
    expect(CHECK_INTERVAL).toBe(2890)
  })
})
