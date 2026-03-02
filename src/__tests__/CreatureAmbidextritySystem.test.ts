import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureAmbidextritySystem } from '../systems/CreatureAmbidextritySystem'
import type { AmbidextrityProfile, HandDominance } from '../systems/CreatureAmbidextritySystem'

// ── 辅助工厂 ──────────────────────────────────────────────────────────────────
let nextId = 1

function makeSys(): CreatureAmbidextritySystem {
  return new CreatureAmbidextritySystem()
}

function makeProfile(entityId: number, dominance: HandDominance = 'right', overrides: Partial<AmbidextrityProfile> = {}): AmbidextrityProfile {
  return {
    id: nextId++,
    entityId,
    dominance,
    leftSkill: 40,
    rightSkill: 60,
    trainingTicks: 0,
    combatBonus: 1.0,
    craftBonus: 1.0,
    ...overrides,
  }
}

function makeEm(entityIds: number[], hasCreature = true) {
  return {
    getEntitiesWithComponents: vi.fn(() => entityIds),
    hasComponent: vi.fn((_id: number, _type: string) => hasCreature),
  }
}

// ── getProfiles ───────────────────────────────────────────────────────────────
describe('CreatureAmbidextritySystem.getProfiles — 基础', () => {
  let sys: CreatureAmbidextritySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('初始无档案', () => { expect(sys.getProfiles()).toHaveLength(0) })

  it('注入后可查询', () => {
    sys.getProfiles().push(makeProfile(1, 'ambidextrous'))
    expect(sys.getProfiles()[0].dominance).toBe('ambidextrous')
  })

  it('返回内部引用（严格相等）', () => {
    sys.getProfiles().push(makeProfile(1))
    expect(sys.getProfiles()).toBe(sys.getProfiles())
  })

  it('支持所有 3 种手部优势', () => {
    const doms: HandDominance[] = ['left', 'right', 'ambidextrous']
    doms.forEach((d, i) => { sys.getProfiles().push(makeProfile(i + 1, d)) })
    const all = sys.getProfiles()
    doms.forEach((d, i) => { expect(all[i].dominance).toBe(d) })
  })

  it('档案的 combatBonus 初始为 1.0', () => {
    sys.getProfiles().push(makeProfile(1))
    expect(sys.getProfiles()[0].combatBonus).toBe(1.0)
  })

  it('档案的 craftBonus 初始为 1.0', () => {
    sys.getProfiles().push(makeProfile(1))
    expect(sys.getProfiles()[0].craftBonus).toBe(1.0)
  })

  it('可以修改 combatBonus 后再读取', () => {
    sys.getProfiles().push(makeProfile(1))
    sys.getProfiles()[0].combatBonus = 1.3
    expect(sys.getProfiles()[0].combatBonus).toBeCloseTo(1.3)
  })

  it('可以修改 leftSkill 后再读取', () => {
    sys.getProfiles().push(makeProfile(1, 'left', { leftSkill: 80 }))
    expect(sys.getProfiles()[0].leftSkill).toBe(80)
  })

  it('档案存储了正确的 entityId', () => {
    sys.getProfiles().push(makeProfile(42))
    expect(sys.getProfiles()[0].entityId).toBe(42)
  })

  it('多个档案长度正确', () => {
    for (let i = 1; i <= 5; i++) sys.getProfiles().push(makeProfile(i))
    expect(sys.getProfiles()).toHaveLength(5)
  })

  it('右利手档案 rightSkill > leftSkill', () => {
    sys.getProfiles().push(makeProfile(1, 'right', { leftSkill: 30, rightSkill: 70 }))
    const p = sys.getProfiles()[0]
    expect(p.rightSkill).toBeGreaterThan(p.leftSkill)
  })

  it('左利手档案 leftSkill > rightSkill', () => {
    sys.getProfiles().push(makeProfile(1, 'left', { leftSkill: 80, rightSkill: 30 }))
    const p = sys.getProfiles()[0]
    expect(p.leftSkill).toBeGreaterThan(p.rightSkill)
  })

  it('ambidextrous 档案两技能均 >= 70', () => {
    sys.getProfiles().push(makeProfile(1, 'ambidextrous', { leftSkill: 75, rightSkill: 80, combatBonus: 1.3, craftBonus: 1.2 }))
    const p = sys.getProfiles()[0]
    expect(p.leftSkill).toBeGreaterThanOrEqual(70)
    expect(p.rightSkill).toBeGreaterThanOrEqual(70)
  })
})

// ── getByEntity ───────────────────────────────────────────────────────────────
describe('CreatureAmbidextritySystem.getByEntity', () => {
  let sys: CreatureAmbidextritySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('不存在时返回 undefined', () => {
    expect(sys.getByEntity(999)).toBeUndefined()
  })

  it('存在时返回对应档案', () => {
    sys.getProfiles().push(makeProfile(42, 'left'))
    const p = sys.getByEntity(42)
    expect(p).toBeDefined()
    expect(p!.dominance).toBe('left')
  })

  it('多个档案时只返回匹配的', () => {
    sys.getProfiles().push(makeProfile(1, 'right'))
    sys.getProfiles().push(makeProfile(2, 'ambidextrous'))
    expect(sys.getByEntity(2)!.dominance).toBe('ambidextrous')
  })

  it('getByEntity 返回同一个对象引用', () => {
    sys.getProfiles().push(makeProfile(7, 'left'))
    const p1 = sys.getByEntity(7)
    const p2 = sys.getByEntity(7)
    expect(p1).toBe(p2)
  })

  it('查询后写入 _entityIds 缓存，再次 getByEntity 仍然正确', () => {
    sys.getProfiles().push(makeProfile(10, 'right'))
    sys.getByEntity(10) // 第一次通过 profiles.find
    const p = sys.getByEntity(10) // 第二次走缓存
    expect(p!.entityId).toBe(10)
  })

  it('通过 getProfiles().push 注入的档案仍可通过 getByEntity 查到', () => {
    const p = makeProfile(55, 'ambidextrous')
    sys.getProfiles().push(p)
    const found = sys.getByEntity(55)
    expect(found).toBeDefined()
    expect(found!.entityId).toBe(55)
  })

  it('查询不存在的 id 不影响已有档案', () => {
    sys.getProfiles().push(makeProfile(1))
    sys.getByEntity(999)
    expect(sys.getProfiles()).toHaveLength(1)
  })

  it('删除档案后 getByEntity 返回 undefined', () => {
    sys.getProfiles().push(makeProfile(5))
    sys.getByEntity(5) // 填充缓存
    // 清空档案（模拟死亡清理）
    sys.getProfiles().splice(0)
    ;(sys as any)._entityIds.clear()
    expect(sys.getByEntity(5)).toBeUndefined()
  })
})

// ── update 逻辑 ──────────────────────────────────────────────────────────────
describe('CreatureAmbidextritySystem.update — 训练与升级', () => {
  let sys: CreatureAmbidextritySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('tick < lastCheck+CHECK_INTERVAL 时 update 不处理（节流期跳过）', () => {
    const em = makeEm([])
    // tick=0：0-0=0 < 1000 → 跳过；tick=500：500-0=500 < 1000 → 跳过
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 500)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick >= lastCheck+1000 时 update 处理生物', () => {
    const em = makeEm([])
    // tick=1000：1000-0=1000 >= 1000 → 执行一次
    sys.update(0, em as any, 1000)
    expect(em.getEntitiesWithComponents).toHaveBeenCalledTimes(1)
  })

  it('右利手训练后 leftSkill 增加', () => {
    const em = makeEm([], true)
    const p = makeProfile(1, 'right', { leftSkill: 50, rightSkill: 60 })
    sys.getProfiles().push(p)
    ;(sys as any)._entityIds.set(1, p)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 1000)
    expect(sys.getProfiles()[0].leftSkill).toBeGreaterThan(50)
  })

  it('左利手训练后 rightSkill 增加', () => {
    const em = makeEm([], true)
    const p = makeProfile(1, 'left', { leftSkill: 60, rightSkill: 50 })
    sys.getProfiles().push(p)
    ;(sys as any)._entityIds.set(1, p)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 1000)
    expect(sys.getProfiles()[0].rightSkill).toBeGreaterThan(50)
  })

  it('两技能均 >= 70 时晋级为 ambidextrous', () => {
    const em = makeEm([], true)
    const p = makeProfile(1, 'right', { leftSkill: 70, rightSkill: 70 })
    sys.getProfiles().push(p)
    ;(sys as any)._entityIds.set(1, p)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 1000)
    expect(sys.getProfiles()[0].dominance).toBe('ambidextrous')
  })

  it('ambidextrous 时 combatBonus = 1.3', () => {
    const em = makeEm([], true)
    const p = makeProfile(1, 'right', { leftSkill: 70, rightSkill: 70 })
    sys.getProfiles().push(p)
    ;(sys as any)._entityIds.set(1, p)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 1000)
    expect(sys.getProfiles()[0].combatBonus).toBeCloseTo(1.3)
  })

  it('ambidextrous 时 craftBonus = 1.2', () => {
    const em = makeEm([], true)
    const p = makeProfile(1, 'right', { leftSkill: 70, rightSkill: 70 })
    sys.getProfiles().push(p)
    ;(sys as any)._entityIds.set(1, p)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 1000)
    expect(sys.getProfiles()[0].craftBonus).toBeCloseTo(1.2)
  })

  it('生物死亡后档案被移除', () => {
    const em = makeEm([], false) // hasComponent 返回 false → 生物已死
    const p = makeProfile(1, 'right')
    sys.getProfiles().push(p)
    ;(sys as any)._entityIds.set(1, p)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 1000)
    expect(sys.getProfiles()).toHaveLength(0)
  })

  it('trainingTicks 每次检查增加 CHECK_INTERVAL', () => {
    const em = makeEm([], true)
    const p = makeProfile(1, 'right', { trainingTicks: 0 })
    sys.getProfiles().push(p)
    ;(sys as any)._entityIds.set(1, p)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 1000)
    expect(sys.getProfiles()[0].trainingTicks).toBe(1000)
  })

  it('技能未达阈值时 combatBonus < 1.3', () => {
    const em = makeEm([], true)
    const p = makeProfile(1, 'right', { leftSkill: 30, rightSkill: 50 })
    sys.getProfiles().push(p)
    ;(sys as any)._entityIds.set(1, p)
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 1000)
    expect(sys.getProfiles()[0].combatBonus).toBeLessThan(1.3)
  })

  it('update 不崩溃（空实体）', () => {
    const em = makeEm([])
    expect(() => sys.update(0, em as any, 0)).not.toThrow()
  })

  it('MAX_PROFILES = 150，超出时不再添加新档案', () => {
    const em = { getEntitiesWithComponents: vi.fn(() => [1]), hasComponent: vi.fn(() => true) }
    // 填满 150 个档案
    for (let i = 1; i <= 150; i++) {
      const p = makeProfile(i + 1000, 'right')
      sys.getProfiles().push(p)
      ;(sys as any)._entityIds.set(i + 1000, p)
    }
    vi.spyOn(Math, 'random').mockReturnValue(0) // 100% 触发 develop
    sys.update(0, em as any, 0)
    sys.update(0, em as any, 1000)
    // 档案数量不超过 150
    expect(sys.getProfiles().length).toBeLessThanOrEqual(150)
    vi.restoreAllMocks()
  })
})

// ── 私有字段直接访问 ──────────────────────────────────────────────────────────
describe('CreatureAmbidextritySystem — 私有字段', () => {
  let sys: CreatureAmbidextritySystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => vi.restoreAllMocks())

  it('_entityIds 初始为空 Map', () => {
    expect((sys as any)._entityIds.size).toBe(0)
  })

  it('nextId 初始为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })

  it('手动向 _entityIds 注入后 getByEntity 可以直接命中缓存', () => {
    const p = makeProfile(77, 'ambidextrous')
    sys.getProfiles().push(p)
    ;(sys as any)._entityIds.set(77, p)
    const found = sys.getByEntity(77)
    expect(found).toBe(p)
  })

  it('技能值上限为 100（TRAIN_RATE 不断累积后不超过）', () => {
    const em = makeEm([], true)
    const p = makeProfile(1, 'right', { leftSkill: 99.95, rightSkill: 60 })
    sys.getProfiles().push(p)
    ;(sys as any)._entityIds.set(1, p)
    // 多次训练
    for (let tick = 0; tick <= 5000; tick += 1000) {
      sys.update(0, em as any, tick)
    }
    expect(sys.getProfiles()[0].leftSkill).toBeLessThanOrEqual(100)
  })
})
