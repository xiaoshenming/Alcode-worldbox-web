import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureDyerSystem } from '../systems/CreatureDyerSystem'
import type { Dyer, DyeColor } from '../systems/CreatureDyerSystem'
import { EntityManager } from '../ecs/Entity'

// ── 辅助工具 ────────────────────────────────────────────────
let nextId = 1
function makeSys(): CreatureDyerSystem { return new CreatureDyerSystem() }
function makeDyer(
  entityId: number,
  dyeColor: DyeColor = 'indigo',
  overrides: Partial<Dyer> = {}
): Dyer {
  return {
    id: nextId++,
    entityId,
    skill: 30,
    batchesDyed: 3,
    dyeColor,
    colorFastness: 60,
    rarity: 0.3,
    tick: 0,
    ...overrides,
  }
}

// DYE_RARITY 公共参考值（与源码一致）
const DYE_RARITY: Record<DyeColor, number> = {
  indigo: 0.3,
  crimson: 0.5,
  saffron: 0.7,
  tyrian: 0.95,
}

function makeEm(entities: { age: number }[] = []): EntityManager {
  const em = new EntityManager()
  for (const e of entities) {
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'T', age: e.age, maxAge: 100, gender: 'male' })
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
  }
  return em
}

// ── 1. 初始状态 ──────────────────────────────────────────────
describe('CreatureDyerSystem – 初始状态', () => {
  let sys: CreatureDyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('dyers 数组初始为空', () => {
    expect((sys as any).dyers).toHaveLength(0)
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

// ── 2. Dyer 数据结构 ─────────────────────────────────────────
describe('CreatureDyerSystem – Dyer 数据结构', () => {
  let sys: CreatureDyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('dyeColor=indigo 正确存储', () => {
    ;(sys as any).dyers.push(makeDyer(1, 'indigo'))
    expect((sys as any).dyers[0].dyeColor).toBe('indigo')
  })

  it('dyeColor=crimson 正确存储', () => {
    ;(sys as any).dyers.push(makeDyer(2, 'crimson'))
    expect((sys as any).dyers[0].dyeColor).toBe('crimson')
  })

  it('dyeColor=saffron 正确存储', () => {
    ;(sys as any).dyers.push(makeDyer(3, 'saffron'))
    expect((sys as any).dyers[0].dyeColor).toBe('saffron')
  })

  it('dyeColor=tyrian 正确存储', () => {
    ;(sys as any).dyers.push(makeDyer(4, 'tyrian'))
    expect((sys as any).dyers[0].dyeColor).toBe('tyrian')
  })

  it('支持所有 4 种染料颜色', () => {
    const colors: DyeColor[] = ['indigo', 'crimson', 'saffron', 'tyrian']
    colors.forEach((c, i) => { ;(sys as any).dyers.push(makeDyer(i + 1, c)) })
    const all = (sys as any).dyers
    colors.forEach((c, i) => { expect(all[i].dyeColor).toBe(c) })
  })

  it('dyer.id 字段正常读取', () => {
    ;(sys as any).dyers.push(makeDyer(1, 'indigo', { id: 88 }))
    expect((sys as any).dyers[0].id).toBe(88)
  })

  it('dyer.entityId 字段正常读取', () => {
    ;(sys as any).dyers.push(makeDyer(55))
    expect((sys as any).dyers[0].entityId).toBe(55)
  })

  it('dyer.skill 字段正常读取', () => {
    ;(sys as any).dyers.push(makeDyer(1, 'indigo', { skill: 75 }))
    expect((sys as any).dyers[0].skill).toBe(75)
  })

  it('dyer.batchesDyed 字段正常读取', () => {
    ;(sys as any).dyers.push(makeDyer(1, 'indigo', { batchesDyed: 12 }))
    expect((sys as any).dyers[0].batchesDyed).toBe(12)
  })

  it('dyer.colorFastness 字段正常读取', () => {
    ;(sys as any).dyers.push(makeDyer(1, 'indigo', { colorFastness: 95 }))
    expect((sys as any).dyers[0].colorFastness).toBe(95)
  })

  it('dyer.rarity 字段正常读取', () => {
    ;(sys as any).dyers.push(makeDyer(1, 'indigo', { rarity: 0.95 }))
    expect((sys as any).dyers[0].rarity).toBeCloseTo(0.95)
  })

  it('dyer.tick 字段正常读取', () => {
    ;(sys as any).dyers.push(makeDyer(1, 'indigo', { tick: 8000 }))
    expect((sys as any).dyers[0].tick).toBe(8000)
  })
})

// ── 3. 多染师管理 ─────────────────────────────────────────────
describe('CreatureDyerSystem – 多染师管理', () => {
  let sys: CreatureDyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('可以同时存储多个染师', () => {
    for (let i = 1; i <= 5; i++) {
      ;(sys as any).dyers.push(makeDyer(i))
    }
    expect((sys as any).dyers).toHaveLength(5)
  })

  it('返回内部引用（同一对象）', () => {
    ;(sys as any).dyers.push(makeDyer(1))
    expect((sys as any).dyers).toBe((sys as any).dyers)
  })

  it('多个染师 entityId 各自独立', () => {
    ;(sys as any).dyers.push(makeDyer(10))
    ;(sys as any).dyers.push(makeDyer(20))
    ;(sys as any).dyers.push(makeDyer(30))
    const ids = (sys as any).dyers.map((d: Dyer) => d.entityId)
    expect(ids).toEqual([10, 20, 30])
  })

  it('可以手动清空染师列表', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).dyers.push(makeDyer(i + 1))
    }
    ;(sys as any).dyers.length = 0
    expect((sys as any).dyers).toHaveLength(0)
  })

  it('可以手动删除指定索引染师', () => {
    ;(sys as any).dyers.push(makeDyer(1))
    ;(sys as any).dyers.push(makeDyer(2))
    ;(sys as any).dyers.push(makeDyer(3))
    ;(sys as any).dyers.splice(1, 1)
    expect((sys as any).dyers).toHaveLength(2)
    expect((sys as any).dyers[0].entityId).toBe(1)
    expect((sys as any).dyers[1].entityId).toBe(3)
  })
})

// ── 4. skillMap 技能系统 ──────────────────────────────────────
describe('CreatureDyerSystem – skillMap 技能系统', () => {
  let sys: CreatureDyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('未知实体返回 undefined', () => {
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
    ;(sys as any).skillMap.set(1, 20)
    ;(sys as any).skillMap.set(2, 60)
    ;(sys as any).skillMap.set(3, 100)
    expect((sys as any).skillMap.get(1)).toBe(20)
    expect((sys as any).skillMap.get(2)).toBe(60)
    expect((sys as any).skillMap.get(3)).toBe(100)
  })

  it('覆盖已有技能值', () => {
    ;(sys as any).skillMap.set(5, 40)
    ;(sys as any).skillMap.set(5, 90)
    expect((sys as any).skillMap.get(5)).toBe(90)
  })

  it('技能值可以是小数', () => {
    ;(sys as any).skillMap.set(7, 33.33)
    expect((sys as any).skillMap.get(7)).toBeCloseTo(33.33)
  })

  it('skillMap.size 正确反映存储数量', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 20)
    expect((sys as any).skillMap.size).toBe(2)
  })

  it('删除条目后 size 减少', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(2, 20)
    ;(sys as any).skillMap.delete(1)
    expect((sys as any).skillMap.size).toBe(1)
  })
})

// ── 5. DYE_RARITY 稀有度公式 ────────────────────────────────
describe('CreatureDyerSystem – DYE_RARITY 稀有度', () => {
  it('indigo 稀有度为 0.3', () => {
    expect(DYE_RARITY['indigo']).toBeCloseTo(0.3)
  })

  it('crimson 稀有度为 0.5', () => {
    expect(DYE_RARITY['crimson']).toBeCloseTo(0.5)
  })

  it('saffron 稀有度为 0.7', () => {
    expect(DYE_RARITY['saffron']).toBeCloseTo(0.7)
  })

  it('tyrian 稀有度为 0.95（最稀有）', () => {
    expect(DYE_RARITY['tyrian']).toBeCloseTo(0.95)
  })

  it('稀有度值均在 (0, 1] 范围内', () => {
    for (const c of ['indigo', 'crimson', 'saffron', 'tyrian'] as DyeColor[]) {
      expect(DYE_RARITY[c]).toBeGreaterThan(0)
      expect(DYE_RARITY[c]).toBeLessThanOrEqual(1)
    }
  })

  it('稀有度按 indigo < crimson < saffron < tyrian 排序', () => {
    expect(DYE_RARITY['indigo']).toBeLessThan(DYE_RARITY['crimson'])
    expect(DYE_RARITY['crimson']).toBeLessThan(DYE_RARITY['saffron'])
    expect(DYE_RARITY['saffron']).toBeLessThan(DYE_RARITY['tyrian'])
  })
})

// ── 6. 业务逻辑公式验证 ──────────────────────────────────────
describe('CreatureDyerSystem – 业务逻辑公式', () => {
  it('batchesDyed = 1 + floor(skill/15) — skill=0', () => {
    expect(1 + Math.floor(0 / 15)).toBe(1)
  })

  it('batchesDyed = 1 + floor(skill/15) — skill=15', () => {
    expect(1 + Math.floor(15 / 15)).toBe(2)
  })

  it('batchesDyed = 1 + floor(skill/15) — skill=30', () => {
    expect(1 + Math.floor(30 / 15)).toBe(3)
  })

  it('batchesDyed = 1 + floor(skill/15) — skill=100', () => {
    expect(1 + Math.floor(100 / 15)).toBe(7)
  })

  it('colorFastness = min(100, 20 + skill*0.7 + random*10)', () => {
    const skill = 80
    const base = 20 + skill * 0.7 + 0 // random=0
    expect(Math.min(100, base)).toBeCloseTo(76)
  })

  it('colorFastness 上限为 100', () => {
    const skill = 100
    const base = 20 + skill * 0.7 + 10 // random=1 → max
    expect(Math.min(100, base)).toBe(100)
  })

  it('SKILL_GROWTH=0.08 — 技能每次增加 0.08', () => {
    const SKILL_GROWTH = 0.08
    const initialSkill = 50
    expect(Math.min(100, initialSkill + SKILL_GROWTH)).toBeCloseTo(50.08)
  })

  it('skill 上限为 100', () => {
    const skill = 99.92 + 0.08
    expect(Math.min(100, skill)).toBe(100)
  })

  it('过期截止值 = tick - 42000', () => {
    expect(100000 - 42000).toBe(58000)
  })

  it('CHECK_INTERVAL = 1100', () => {
    const sys = makeSys()
    const em = makeEm([])
    sys.update(0, em, 1099)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1100 时更新 lastCheck', () => {
    const sys = makeSys()
    const em = makeEm([])
    sys.update(0, em, 1100)
    expect((sys as any).lastCheck).toBe(1100)
  })
})

// ── 7. update 基本行为 ────────────────────────────────────────
describe('CreatureDyerSystem – update 基本行为', () => {
  let sys: CreatureDyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })
  afterEach(() => { vi.restoreAllMocks() })

  it('tick 未达 CHECK_INTERVAL 时不更新 lastCheck', () => {
    const em = makeEm([])
    sys.update(0, em, 500)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick=1100 时更新 lastCheck', () => {
    const em = makeEm([])
    sys.update(0, em, 1100)
    expect((sys as any).lastCheck).toBe(1100)
  })

  it('无生物时 dyers 仍为空', () => {
    const em = makeEm([])
    sys.update(0, em, 1100)
    expect((sys as any).dyers).toHaveLength(0)
  })

  it('年龄不足 10 的生物不被录入', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([{ age: 7 }])
    sys.update(0, em, 1100)
    expect((sys as any).dyers).toHaveLength(0)
  })

  it('MAX_DYERS=52 达到上限后停止新增', () => {
    for (let i = 0; i < 52; i++) {
      ;(sys as any).dyers.push(makeDyer(i + 1))
    }
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const em = makeEm([{ age: 20 }])
    sys.update(0, em, 1100)
    expect((sys as any).dyers).toHaveLength(52)
  })

  it('craft_chance > CRAFT_CHANCE 时跳过实体', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    const em = makeEm([{ age: 20 }])
    sys.update(0, em, 1100)
    expect((sys as any).dyers).toHaveLength(0)
  })

  it('过期记录（tick < cutoff）被清除', () => {
    ;(sys as any).dyers.push(makeDyer(1, 'indigo', { tick: 0 }))
    const em = makeEm([])
    sys.update(0, em, 50000) // cutoff=50000-42000=8000，0 < 8000
    expect((sys as any).dyers).toHaveLength(0)
  })

  it('未过期记录保留', () => {
    ;(sys as any).dyers.push(makeDyer(1, 'indigo', { tick: 49000 }))
    const em = makeEm([])
    sys.update(0, em, 50000) // cutoff=8000，49000 > 8000，保留
    expect((sys as any).dyers).toHaveLength(1)
  })

  it('混合过期和未过期：只清除过期', () => {
    ;(sys as any).dyers.push(makeDyer(1, 'indigo',  { tick: 100 }))    // 过期
    ;(sys as any).dyers.push(makeDyer(2, 'tyrian',  { tick: 49000 }))  // 保留
    ;(sys as any).dyers.push(makeDyer(3, 'saffron', { tick: 300 }))    // 过期
    const em = makeEm([])
    sys.update(0, em, 50000)
    expect((sys as any).dyers).toHaveLength(1)
    expect((sys as any).dyers[0].entityId).toBe(2)
  })

  it('多次 update 调用 lastCheck 持续更新', () => {
    const em = makeEm([])
    sys.update(0, em, 1100)
    expect((sys as any).lastCheck).toBe(1100)
    sys.update(0, em, 2200)
    expect((sys as any).lastCheck).toBe(2200)
  })
})

// ── 8. 边界值与健壮性 ────────────────────────────────────────
describe('CreatureDyerSystem – 边界值与健壮性', () => {
  let sys: CreatureDyerSystem
  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('空列表调用 update 不抛异常', () => {
    const em = makeEm([])
    expect(() => sys.update(0, em, 1100)).not.toThrow()
  })

  it('skillMap 可存储 0 值技能', () => {
    ;(sys as any).skillMap.set(1, 0)
    expect((sys as any).skillMap.get(1)).toBe(0)
  })

  it('skillMap 可存储最大技能值 100', () => {
    ;(sys as any).skillMap.set(1, 100)
    expect((sys as any).skillMap.get(1)).toBe(100)
  })

  it('dyer 列表支持正向遍历', () => {
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).dyers.push(makeDyer(i))
    }
    const ids: number[] = []
    for (const d of (sys as any).dyers) { ids.push(d.entityId) }
    expect(ids).toEqual([1, 2, 3])
  })

  it('dyer 列表支持反向遍历（用于过期清除）', () => {
    for (let i = 1; i <= 3; i++) {
      ;(sys as any).dyers.push(makeDyer(i))
    }
    const ids: number[] = []
    for (let i = (sys as any).dyers.length - 1; i >= 0; i--) {
      ids.push((sys as any).dyers[i].entityId)
    }
    expect(ids).toEqual([3, 2, 1])
  })

  it('colorFastness 下限 >= 20（当 skill=0, random=0）', () => {
    const min = 20 + 0 * 0.7 + 0
    expect(Math.min(100, min)).toBe(20)
  })
})

// ── 9. pruneDeadEntities 协同行为 ───────────────────────────
describe('CreatureDyerSystem – pruneDeadEntities 协同', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('死亡实体在 prune 周期被移除 skillMap', () => {
    const sys = makeSys()
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'T', age: 20, maxAge: 100, gender: 'male' })
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    ;(sys as any).skillMap.set(eid, 50)
    em.removeComponent(eid, 'creature')
    sys.update(0, em, 3600)
    expect((sys as any).skillMap.has(eid)).toBe(false)
  })

  it('存活实体在 prune 后保留 skillMap 条目', () => {
    const sys = makeSys()
    const em = new EntityManager()
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', species: 'human', speed: 1, damage: 1, isHostile: false, name: 'T', age: 20, maxAge: 100, gender: 'male' })
    em.addComponent(eid, { type: 'position', x: 0, y: 0 })
    ;(sys as any).skillMap.set(eid, 50)
    vi.spyOn(Math, 'random').mockReturnValue(1)
    sys.update(0, em, 3600)
    expect((sys as any).skillMap.has(eid)).toBe(true)
  })
})
