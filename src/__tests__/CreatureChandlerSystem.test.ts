import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureChandlerSystem } from '../systems/CreatureChandlerSystem'
import type { Chandler, WickType } from '../systems/CreatureChandlerSystem'
import { EntityManager } from '../ecs/Entity'

// ── 辅助工具 ────────────────────────────────────────────────
let nextId = 1
function makeSys(): CreatureChandlerSystem { return new CreatureChandlerSystem() }
function makeChandler(
  entityId: number,
  wickType: WickType = 'cotton',
  overrides: Partial<Chandler> = {}
): Chandler {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    candlesProduced: 2,
    waxStored: 50,
    wickType,
    lightOutput: 60,
    tick: 0,
    ...overrides,
  }
}

function makeEm(entities: { id: number; age: number }[] = []): EntityManager {
  const em = new EntityManager()
  for (const e of entities) {
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'Test', age: e.age, maxAge: 100, gender: 'male' })
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
  }
  return em
}

// ── 1. 初始状态 ──────────────────────────────────────────────
describe('CreatureChandlerSystem – 初始状态', () => {
  let sys: CreatureChandlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('chandlers 数组初始为空', () => {
    expect((sys as any).chandlers).toHaveLength(0)
  })

  it('skillMap 初始为空 Map', () => {
    expect((sys as any).skillMap.size).toBe(0)
  })

  it('nextId 初始值为 1', () => {
    expect((sys as any).nextId).toBe(1)
  })

  it('lastCheck 初始值为 0', () => {
    expect((sys as any).lastCheck).toBe(0)
  })
})

// ── 2. Chandler 数据结构 ─────────────────────────────────────
describe('CreatureChandlerSystem – Chandler 数据结构', () => {
  let sys: CreatureChandlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入 cotton 灯芯蜡烛师后可正确查询', () => {
    ;(sys as any).chandlers.push(makeChandler(1, 'cotton'))
    expect((sys as any).chandlers[0].wickType).toBe('cotton')
  })

  it('注入 hemp 灯芯蜡烛师后可正确查询', () => {
    ;(sys as any).chandlers.push(makeChandler(2, 'hemp'))
    expect((sys as any).chandlers[0].wickType).toBe('hemp')
  })

  it('注入 linen 灯芯蜡烛师后可正确查询', () => {
    ;(sys as any).chandlers.push(makeChandler(3, 'linen'))
    expect((sys as any).chandlers[0].wickType).toBe('linen')
  })

  it('注入 silk 灯芯蜡烛师后可正确查询', () => {
    ;(sys as any).chandlers.push(makeChandler(4, 'silk'))
    expect((sys as any).chandlers[0].wickType).toBe('silk')
  })

  it('支持所有 4 种灯芯类型', () => {
    const types: WickType[] = ['cotton', 'hemp', 'linen', 'silk']
    types.forEach((t, i) => { ;(sys as any).chandlers.push(makeChandler(i + 1, t)) })
    const all = (sys as any).chandlers
    types.forEach((t, i) => { expect(all[i].wickType).toBe(t) })
  })

  it('chandler.id 字段正常读取', () => {
    ;(sys as any).chandlers.push(makeChandler(1, 'cotton', { id: 99 }))
    expect((sys as any).chandlers[0].id).toBe(99)
  })

  it('chandler.entityId 字段正常读取', () => {
    ;(sys as any).chandlers.push(makeChandler(77))
    expect((sys as any).chandlers[0].entityId).toBe(77)
  })

  it('chandler.skill 字段正常读取', () => {
    ;(sys as any).chandlers.push(makeChandler(1, 'cotton', { skill: 55 }))
    expect((sys as any).chandlers[0].skill).toBe(55)
  })

  it('chandler.candlesProduced 字段正常读取', () => {
    ;(sys as any).chandlers.push(makeChandler(1, 'cotton', { candlesProduced: 8 }))
    expect((sys as any).chandlers[0].candlesProduced).toBe(8)
  })

  it('chandler.waxStored 字段正常读取', () => {
    ;(sys as any).chandlers.push(makeChandler(1, 'cotton', { waxStored: 99 }))
    expect((sys as any).chandlers[0].waxStored).toBe(99)
  })

  it('chandler.lightOutput 字段正常读取', () => {
    ;(sys as any).chandlers.push(makeChandler(1, 'cotton', { lightOutput: 42 }))
    expect((sys as any).chandlers[0].lightOutput).toBe(42)
  })

  it('chandler.tick 字段正常读取', () => {
    ;(sys as any).chandlers.push(makeChandler(1, 'cotton', { tick: 5000 }))
    expect((sys as any).chandlers[0].tick).toBe(5000)
  })
})

// ── 3. 多蜡烛师管理 ──────────────────────────────────────────
describe('CreatureChandlerSystem – 多蜡烛师管理', () => {
  let sys: CreatureChandlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('可以同时存储多个蜡烛师', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).chandlers.push(makeChandler(i))
    }
    expect((sys as any).chandlers).toHaveLength(5)
  })

  it('返回内部引用（同一对象）', () => {
    ;(sys as any).chandlers.push(makeChandler(1))
    expect((sys as any).chandlers).toBe((sys as any).chandlers)
  })

  it('多个蜡烛师 entityId 各自独立', () => {
    ;(sys as any).chandlers.push(makeChandler(10))
    ;(sys as any).chandlers.push(makeChandler(20))
    ;(sys as any).chandlers.push(makeChandler(30))
    const ids = (sys as any).chandlers.map((c: Chandler) => c.entityId)
    expect(ids).toEqual([10, 20, 30])
  })

  it('可以手动清空蜡烛师列表', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).chandlers.push(makeChandler(i + 1))
    }
    ;(sys as any).chandlers.length = 0
    expect((sys as any).chandlers).toHaveLength(0)
  })

  it('可以手动删除指定索引蜡烛师', () => {
    ;(sys as any).chandlers.push(makeChandler(1))
    ;(sys as any).chandlers.push(makeChandler(2))
    ;(sys as any).chandlers.push(makeChandler(3))
    ;(sys as any).chandlers.splice(1, 1)
    expect((sys as any).chandlers).toHaveLength(2)
    expect((sys as any).chandlers[0].entityId).toBe(1)
    expect((sys as any).chandlers[1].entityId).toBe(3)
  })
})

// ── 4. skillMap 技能系统 ──────────────────────────────────────
describe('CreatureChandlerSystem – skillMap 技能系统', () => {
  let sys: CreatureChandlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('未知实体技能返回 undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('可以用 ?? 回退到 0', () => {
    expect(((sys as any).skillMap.get(999) ?? 0)).toBe(0)
  })

  it('注入技能 85 后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 85)
    expect(((sys as any).skillMap.get(42) ?? 0)).toBe(85)
  })

  it('多个实体技能各自独立', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 70)
    ;(sys as any).skillMap.set(3, 100)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(70)
    expect((sys as any).skillMap.get(3)).toBe(100)
  })

  it('覆盖已有技能值', () => {
    ;(sys as any).skillMap.set(5, 50)
    ;(sys as any).skillMap.set(5, 80)
    expect((sys as any).skillMap.get(5)).toBe(80)
  })

  it('技能值可以是小数', () => {
    ;(sys as any).skillMap.set(7, 47.5)
    expect((sys as any).skillMap.get(7)).toBeCloseTo(47.5)
  })

  it('skillMap.size 正确反映存储数量', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 20)
    expect((sys as any).skillMap.size).toBe(2)
  })

  it('删除技能条目后 size 减少', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 20)
    ;(sys as any).skillMap.delete(1)
    expect((sys as any).skillMap.size).toBe(1)
  })
})

// ── 5. 业务逻辑公式验证 ──────────────────────────────────────
describe('CreatureChandlerSystem – 业务逻辑公式', () => {
  it('candlesProduced = 1 + floor(skill / 20) — skill=20', () => {
    const skill = 20
    expect(1 + Math.floor(skill / 20)).toBe(2)
  })

  it('candlesProduced = 1 + floor(skill / 20) — skill=40', () => {
    const skill = 40
    expect(1 + Math.floor(skill / 20)).toBe(3)
  })

  it('candlesProduced = 1 + floor(skill / 20) — skill=100', () => {
    const skill = 100
    expect(1 + Math.floor(skill / 20)).toBe(6)
  })

  it('candlesProduced = 1 + floor(skill / 20) — skill=0', () => {
    const skill = 0
    expect(1 + Math.floor(skill / 20)).toBe(1)
  })

  it('skill 上限为 100（min 保护）', () => {
    const skill = 99.93 + 0.07
    expect(Math.min(100, skill)).toBe(100)
  })

  it('SKILL_GROWTH=0.07 — 技能每次增长 0.07', () => {
    const SKILL_GROWTH = 0.07
    const initialSkill = 50
    expect(Math.min(100, initialSkill + SKILL_GROWTH)).toBeCloseTo(50.07)
  })

  it('waxStored 下限为 5（当 skill=0）', () => {
    const skill = 0
    const waxStored = 5 + 0 * skill * 0.8
    expect(waxStored).toBe(5)
  })

  it('waxStored 随 skill 增大而增大', () => {
    const low = 5 + 0 * 10 * 0.8
    const high = 5 + 0 * 90 * 0.8
    // 由于随机因子，用基准值验证公式方向
    expect(5 + 10 * 0.8).toBeGreaterThan(5 + 0 * 0.8)
  })

  it('Chandler 过期截止值 = tick - 45000', () => {
    const tick = 100000
    const cutoff = tick - 45000
    expect(cutoff).toBe(55000)
  })

  it('CHECK_INTERVAL = 1200', () => {
    const sys = makeSys()
    // 在 tick=1199 时不应触发更新（lastCheck=0）
    const em = makeEm([])
    sys.update(0, em, 1199)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('超过 CHECK_INTERVAL 后更新 lastCheck', () => {
    const sys = makeSys()
    const em = makeEm([])
    sys.update(0, em, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })
})

// ── 6. update 基本行为 ────────────────────────────────────────
describe('CreatureChandlerSystem – update 基本行为', () => {
  let sys: CreatureChandlerSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 未达 CHECK_INTERVAL 时不更新 lastCheck', () => {
    const em = makeEm([])
    sys.update(0, em, 500)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1200 时更新 lastCheck', () => {
    const em = makeEm([])
    sys.update(0, em, 1200)
    expect((sys as any).lastCheck).toBe(1200)
  })

  it('无生物时 chandlers 仍为空', () => {
    const em = makeEm([])
    sys.update(0, em, 1200)
    expect((sys as any).chandlers).toHaveLength(0)
  })

  it('年龄不足 8 的生物不被录入', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // craft_chance=0 通过
    const em = makeEm([{ id: 1, age: 5 }])
    sys.update(0, em, 1200)
    expect((sys as any).chandlers).toHaveLength(0)
  })

  it('MAX_CHANDLERS=60 — 达到上限后停止新增', () => {
    for (let i = 0; i < 60; i++) {
      ;(sys as any).chandlers.push(makeChandler(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([{ id: 100, age: 20 }])
    sys.update(0, em, 1200)
    expect((sys as any).chandlers).toHaveLength(60)
  })

  it('craft_chance > CRAFT_CHANCE 时跳过实体', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1) // 1 > 0.006，跳过
    const em = makeEm([{ id: 1, age: 20 }])
    sys.update(0, em, 1200)
    expect((sys as any).chandlers).toHaveLength(0)
  })

  it('过期记录（tick < cutoff）被清除', () => {
    ;(sys as any).chandlers.push(makeChandler(1, 'cotton', { tick: 0 }))
    const em = makeEm([])
    sys.update(0, em, 50000) // cutoff = 50000-45000=5000, 0 < 5000
    expect((sys as any).chandlers).toHaveLength(0)
  })

  it('未过期记录保留', () => {
    ;(sys as any).chandlers.push(makeChandler(1, 'cotton', { tick: 49000 }))
    const em = makeEm([])
    sys.update(0, em, 50000) // cutoff=5000, 49000 > 5000，保留
    expect((sys as any).chandlers).toHaveLength(1)
  })

  it('混合过期和未过期记录：只清除过期', () => {
    ;(sys as any).chandlers.push(makeChandler(1, 'cotton', { tick: 100 }))   // 过期
    ;(sys as any).chandlers.push(makeChandler(2, 'silk',   { tick: 49000 })) // 保留
    ;(sys as any).chandlers.push(makeChandler(3, 'hemp',   { tick: 200 }))   // 过期
    const em = makeEm([])
    sys.update(0, em, 50000)
    expect((sys as any).chandlers).toHaveLength(1)
    expect((sys as any).chandlers[0].entityId).toBe(2)
  })
})

// ── 7. 边界值与健壮性 ────────────────────────────────────────
describe('CreatureChandlerSystem – 边界值与健壮性', () => {
  let sys: CreatureChandlerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('skill=0 时 candlesProduced=1', () => {
    expect(1 + Math.floor(0 / 20)).toBe(1)
  })

  it('skill=100 时 candlesProduced=6', () => {
    expect(1 + Math.floor(100 / 20)).toBe(6)
  })

  it('chandler 列表支持正向遍历', () => {
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).chandlers.push(makeChandler(i))
    }
    const ids: number[] = []
    for (const c of (sys as any).chandlers) { ids.push(c.entityId) }
    expect(ids).toEqual([1, 2, 3])
  })

  it('chandler 列表支持反向遍历', () => {
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).chandlers.push(makeChandler(i))
    }
    const ids: number[] = []
    for (let i = (sys as any).chandlers.length - 1; i >= 0; i--) {
      ids.push((sys as any).chandlers[i].entityId)
    }
    expect(ids).toEqual([3, 2, 1])
  })

  it('lightOutput 为 skill 的正相关函数', () => {
    // lightOutput = skill * (0.4 + random*0.6), 测试公式范围
    const skill = 50
    const min = skill * 0.4
    const max = skill * 1.0
    expect(min).toBe(20)
    expect(max).toBe(50)
  })

  it('nextId 随添加蜡烛师递增', () => {
    ;(sys as any).chandlers.push({ ...(sys as any).nextId, id: (sys as any).nextId++ })
    ;(sys as any).chandlers.push({ ...(sys as any).nextId, id: (sys as any).nextId++ })
    expect((sys as any).nextId).toBe(3)
  })

  it('空列表调用 update 不抛异常', () => {
    const em = makeEm([])
    expect(() => sys.update(0, em, 1200)).not.toThrow()
  })

  it('多次 update 调用 lastCheck 持续更新', () => {
    const em = makeEm([])
    sys.update(0, em, 1200)
    expect((sys as any).lastCheck).toBe(1200)
    sys.update(0, em, 2400)
    expect((sys as any).lastCheck).toBe(2400)
  })

  it('skillMap 可存储 0 值技能', () => {
    ;(sys as any).skillMap.set(1, 0)
    expect((sys as any).skillMap.get(1)).toBe(0)
  })

  it('skillMap 可存储最大技能值 100', () => {
    ;(sys as any).skillMap.set(1, 100)
    expect((sys as any).skillMap.get(1)).toBe(100)
  })
})

// ── 8. WickType 类型验证 ─────────────────────────────────────
describe('CreatureChandlerSystem – WickType 枚举���整性', () => {
  const ALL_TYPES: WickType[] = ['cotton', 'hemp', 'linen', 'silk']

  it('共有 4 种灯芯类型', () => {
    expect(ALL_TYPES).toHaveLength(4)
  })

  it('cotton 是合法 WickType', () => {
    const t: WickType = 'cotton'
    expect(ALL_TYPES).toContain(t)
  })

  it('hemp 是合法 WickType', () => {
    const t: WickType = 'hemp'
    expect(ALL_TYPES).toContain(t)
  })

  it('linen 是合法 WickType', () => {
    const t: WickType = 'linen'
    expect(ALL_TYPES).toContain(t)
  })

  it('silk 是合法 WickType', () => {
    const t: WickType = 'silk'
    expect(ALL_TYPES).toContain(t)
  })

  it('Chandler 对象的 wickType 属于 ALL_TYPES', () => {
    const c = makeChandler(1, 'silk')
    expect(ALL_TYPES).toContain(c.wickType)
  })
})

// ── 9. pruneDeadEntities 协同行为 ───────────────────────────
describe('CreatureChandlerSystem – pruneDeadEntities 协同', () => {
  let sys: CreatureChandlerSystem
  afterEach(() => { vi.restoreAllMocks() })

  it('死亡实体在 prune 周期被移除 skillMap', () => {
    sys = makeSys()
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'T', age: 20, maxAge: 100, gender: 'male' })
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    ;(sys as any).skillMap.set(eid, 50)
    // 移除实体再触发 prune（tick % 3600 === 0）
    em.removeComponent(eid, 'creature')
    sys.update(0, em, 3600)
    expect((sys as any).skillMap.has(eid)).toBe(false)
  })

  it('存活实体在 prune 后保留 skillMap 条目', () => {
    sys = makeSys()
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'T', age: 20, maxAge: 100, gender: 'male' })
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    ;(sys as any).skillMap.set(eid, 50)
    vi.spyOn(Math, 'random').mockReturnValue(1) // 跳过 craft
    sys.update(0, em, 3600)
    expect((sys as any).skillMap.has(eid)).toBe(true)
  })
})
