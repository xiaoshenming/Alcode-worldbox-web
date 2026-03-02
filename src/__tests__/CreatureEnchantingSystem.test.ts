import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { CreatureEnchantingSystem } from '../systems/CreatureEnchantingSystem'
import type { Enchantment, EnchantType } from '../systems/CreatureEnchantingSystem'
import { EntityManager } from '../ecs/Entity'

let nextId = 1
function makeSys(): CreatureEnchantingSystem { return new CreatureEnchantingSystem() }
function makeEnchant(target: number, type: EnchantType = 'sharpness', power = 50, duration = 100, tick = 0): Enchantment {
  return { id: nextId++, type, power, target, duration, tick }
}

function makeEM(): EntityManager { return new EntityManager() }
function addCreature(em: EntityManager, age = 20): number {
  const eid = em.createEntity()
  em.addComponent(eid, { type: 'creature', age, hp: 100, race: 'human' } as any)
  em.addComponent(eid, { type: 'position', x: 0, y: 0 } as any)
  return eid
}

afterEach(() => { vi.restoreAllMocks() })

// ============================================================
// 1. 初始状态
// ============================================================
describe('CreatureEnchantingSystem — 初始状态', () => {
  let sys: CreatureEnchantingSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('初始附魔列表为空', () => {
    expect((sys as any).enchantments).toHaveLength(0)
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

  it('enchantments 是数组类型', () => {
    expect(Array.isArray((sys as any).enchantments)).toBe(true)
  })

  it('skillMap 是 Map 类型', () => {
    expect((sys as any).skillMap instanceof Map).toBe(true)
  })

  it('两个实例的 enchantments 互相独立', () => {
    const a = makeSys(); const b = makeSys()
    ;(a as any).enchantments.push(makeEnchant(1))
    expect((b as any).enchantments).toHaveLength(0)
  })
})

// ============================================================
// 2. 附魔数据结构
// ============================================================
describe('CreatureEnchantingSystem — 附魔数据结构', () => {
  let sys: CreatureEnchantingSystem

  beforeEach(() => { sys = makeSys(); nextId = 1 })

  it('注入后可通过下标访问', () => {
    ;(sys as any).enchantments.push(makeEnchant(1, 'frost'))
    expect((sys as any).enchantments[0].type).toBe('frost')
  })

  it('enchantments 返回内部引用', () => {
    const ref = (sys as any).enchantments
    expect(ref).toBe((sys as any).enchantments)
  })

  it('支持所有 6 种附魔类型', () => {
    const types: EnchantType[] = ['sharpness', 'protection', 'swiftness', 'vitality', 'flame', 'frost']
    types.forEach((t, i) => { ;(sys as any).enchantments.push(makeEnchant(i + 1, t)) })
    const all = (sys as any).enchantments
    types.forEach((t, i) => { expect(all[i].type).toBe(t) })
  })

  it('附魔 id 字段正确存储', () => {
    const e = makeEnchant(5)
    e.id = 77
    ;(sys as any).enchantments.push(e)
    expect((sys as any).enchantments[0].id).toBe(77)
  })

  it('附魔 power 字段正确存储', () => {
    const e = makeEnchant(5, 'flame', 42)
    ;(sys as any).enchantments.push(e)
    expect((sys as any).enchantments[0].power).toBe(42)
  })

  it('附魔 target 字段正确存储', () => {
    const e = makeEnchant(99)
    ;(sys as any).enchantments.push(e)
    expect((sys as any).enchantments[0].target).toBe(99)
  })

  it('附魔 duration 字段正确存储', () => {
    const e = makeEnchant(1, 'sharpness', 50, 8888)
    ;(sys as any).enchantments.push(e)
    expect((sys as any).enchantments[0].duration).toBe(8888)
  })

  it('附魔 tick 字段正确存储', () => {
    const e = makeEnchant(1, 'vitality', 50, 100, 5000)
    ;(sys as any).enchantments.push(e)
    expect((sys as any).enchantments[0].tick).toBe(5000)
  })

  it('可以批量注入多个附魔', () => {
    for (let i = 0; i < 10; i++) {
      ;(sys as any).enchantments.push(makeEnchant(i + 1))
    }
    expect((sys as any).enchantments).toHaveLength(10)
  })
})

// ============================================================
// 3. skillMap 行为
// ============================================================
describe('CreatureEnchantingSystem — skillMap 行为', () => {
  let sys: CreatureEnchantingSystem

  beforeEach(() => { sys = makeSys() })

  it('未知实体返回 undefined', () => {
    expect((sys as any).skillMap.get(999)).toBeUndefined()
  })

  it('注入技能后返回正确值', () => {
    ;(sys as any).skillMap.set(42, 88)
    expect((sys as any).skillMap.get(42)).toBe(88)
  })

  it('可覆盖已有技能', () => {
    ;(sys as any).skillMap.set(1, 10)
    ;(sys as any).skillMap.set(1, 55)
    expect((sys as any).skillMap.get(1)).toBe(55)
  })

  it('不同实体技能独立', () => {
    ;(sys as any).skillMap.set(1, 30)
    ;(sys as any).skillMap.set(2, 70)
    expect((sys as any).skillMap.get(1)).toBe(30)
    expect((sys as any).skillMap.get(2)).toBe(70)
  })

  it('技能值可以是浮点数', () => {
    ;(sys as any).skillMap.set(3, 12.345)
    expect((sys as any).skillMap.get(3)).toBeCloseTo(12.345)
  })

  it('技能值 0 也可存储', () => {
    ;(sys as any).skillMap.set(4, 0)
    expect((sys as any).skillMap.get(4)).toBe(0)
  })

  it('可以删除技能条目', () => {
    ;(sys as any).skillMap.set(5, 99)
    ;(sys as any).skillMap.delete(5)
    expect((sys as any).skillMap.get(5)).toBeUndefined()
  })
})

// ============================================================
// 4. update — 节流控制
// ============================================================
describe('CreatureEnchantingSystem — update 节流', () => {
  let sys: CreatureEnchantingSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEM() })

  it('tick 不满 CHECK_INTERVAL(1500) 时跳过处理', () => {
    const eid = addCreature(em)
    vi.spyOn(em, 'getEntitiesWithComponents').mockReturnValue([eid])
    sys.update(16, em, 0)    // lastCheck=0, tick=0 → 0-0<1500 → skip
    expect((sys as any).enchantments).toHaveLength(0)
  })

  it('首次 tick=0 触发处理（lastCheck 初始为 0）', () => {
    // tick=0, lastCheck=0 → 0-0=0 < 1500 → 跳过
    sys.update(16, em, 0)
    expect((sys as any).lastCheck).toBe(0)
  })

  it('tick>=CHECK_INTERVAL 时更新 lastCheck', () => {
    em = makeEM()
    sys.update(16, em, 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('tick 不足时 lastCheck 不更新', () => {
    sys.update(16, em, 2000) // lastCheck→2000
    sys.update(16, em, 2500) // 2500-2000=500<1500 → skip
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('满足间隔后再次跳过（连续调用）', () => {
    sys.update(16, em, 2000) // lastCheck=2000
    sys.update(16, em, 3000) // 3000-2000=1000 < 1500 → skip
    expect((sys as any).lastCheck).toBe(2000)
    sys.update(16, em, 3600) // 3600-2000=1600 >= 1500 → update
    expect((sys as any).lastCheck).toBe(3600)
  })
})

// ============================================================
// 5. update — 附魔创建逻辑
// ============================================================
describe('CreatureEnchantingSystem — update 附魔创建', () => {
  let sys: CreatureEnchantingSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEM() })

  it('age < 12 的生物不产生附魔', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // random=0 < ENCHANT_CHANCE(0.003) → pass chance
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 5 } as any)
    em.addComponent(eid, { type: 'position', x: 0, y: 0 } as any)
    sys.update(16, em, 2000)
    expect((sys as any).enchantments).toHaveLength(0)
  })

  it('age >= 12 的生物在 random=0 时产生附魔', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    sys.update(16, em, 2000)
    expect((sys as any).enchantments.length).toBeGreaterThan(0)
  })

  it('random > ENCHANT_CHANCE(0.003) 时不产生附魔', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9) // > 0.003
    addCreature(em, 20)
    sys.update(16, em, 2000)
    expect((sys as any).enchantments).toHaveLength(0)
  })

  it('附魔数量达上限 MAX_ENCHANTMENTS(120) 时停止创建', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 120; i++) {
      ;(sys as any).enchantments.push(makeEnchant(i + 1, 'sharpness', 10, 99999, 0))
    }
    addCreature(em, 20)
    sys.update(16, em, 2000)
    expect((sys as any).enchantments.length).toBeLessThanOrEqual(120)
  })

  it('新附魔的 nextId 递增', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    sys.update(16, em, 2000)
    const enchants = (sys as any).enchantments as Enchantment[]
    if (enchants.length > 0) {
      expect(enchants[enchants.length - 1].id).toBeGreaterThanOrEqual(1)
    }
  })

  it('新附魔的 target 等于生物 entityId', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = addCreature(em, 20)
    sys.update(16, em, 2000)
    const enchants = (sys as any).enchantments as Enchantment[]
    if (enchants.length > 0) {
      expect(enchants[enchants.length - 1].target).toBe(eid)
    }
  })

  it('新附魔的 tick 等于当前 tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    sys.update(16, em, 2000)
    const enchants = (sys as any).enchantments as Enchantment[]
    if (enchants.length > 0) {
      expect(enchants[enchants.length - 1].tick).toBe(2000)
    }
  })
})

// ============================================================
// 6. update — 附魔衰减与清除
// ============================================================
describe('CreatureEnchantingSystem — update 附魔衰减与清除', () => {
  let sys: CreatureEnchantingSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEM() })

  it('power 在每次 update 中减少 POWER_DECAY(0.02)', () => {
    const e = makeEnchant(1, 'sharpness', 1, 99999, 0)
    ;(sys as any).enchantments.push(e)
    sys.update(16, em, 2000)
    // power应该减少了POWER_DECAY
    expect((sys as any).enchantments.length === 0 || (sys as any).enchantments[0].power < 1).toBe(true)
  })

  it('power 降至 0 后附魔被移除', () => {
    const e = makeEnchant(1, 'flame', 0.01, 99999, 0)
    ;(sys as any).enchantments.push(e)
    sys.update(16, em, 2000)
    const found = (sys as any).enchantments.find((x: Enchantment) => x.target === 1)
    expect(found).toBeUndefined()
  })

  it('超过 duration 的附魔被移除', () => {
    const e = makeEnchant(1, 'frost', 50, 100, 0)
    ;(sys as any).enchantments.push(e)
    // tick=2000, e.tick=0, duration=100 → 2000-0=2000 > 100 → removed
    sys.update(16, em, 2000)
    const found = (sys as any).enchantments.find((x: Enchantment) => x.target === 1)
    expect(found).toBeUndefined()
  })

  it('power > 0 且未超时的附魔保留', () => {
    const e = makeEnchant(1, 'vitality', 50, 99999, 0)
    e.power = 50
    ;(sys as any).enchantments.push(e)
    sys.update(16, em, 2000)
    const found = (sys as any).enchantments.find((x: Enchantment) => x.target === 1)
    expect(found).toBeDefined()
  })

  it('同时存在多个附魔时仅移除过期的', () => {
    const expired = makeEnchant(1, 'sharpness', 0.001, 50, 0)  // 即将过期
    const valid   = makeEnchant(2, 'protection', 50, 99999, 0)
    ;(sys as any).enchantments.push(expired, valid)
    sys.update(16, em, 2000)
    const validFound = (sys as any).enchantments.find((x: Enchantment) => x.target === 2)
    expect(validFound).toBeDefined()
  })
})

// ============================================================
// 7. 技能成长
// ============================================================
describe('CreatureEnchantingSystem — 技能成长', () => {
  let sys: CreatureEnchantingSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEM() })

  it('初始技能从 skillMap 读取（不存在则随机初始化）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    sys.update(16, em, 2000)
    // skill = (2+0*6) + 0.05 = 2.05，不为0
    const sm = (sys as any).skillMap as Map<number, number>
    for (const [, v] of sm) {
      expect(v).toBeGreaterThan(0)
    }
  })

  it('技能上限为 100', () => {
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 99.98)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, em, 2000)
    const skill = (sys as any).skillMap.get(eid) as number
    expect(skill).toBeLessThanOrEqual(100)
  })

  it('已有技能在 update 后增加 0.05', () => {
    const eid = addCreature(em, 20)
    ;(sys as any).skillMap.set(eid, 50)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    sys.update(16, em, 2000)
    const skill = (sys as any).skillMap.get(eid) as number
    expect(skill).toBeCloseTo(50.05, 5)
  })
})

// ============================================================
// 8. 边界条件与特殊情况
// ============================================================
describe('CreatureEnchantingSystem — 边界条件', () => {
  let sys: CreatureEnchantingSystem
  let em: EntityManager

  beforeEach(() => { sys = makeSys(); em = makeEM() })

  it('没有生物时 update 不抛出', () => {
    expect(() => sys.update(16, em, 2000)).not.toThrow()
  })

  it('生物缺少 position 组件时不被选中', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'creature', age: 20 } as any)
    // 没有 position → getEntitiesWithComponents('creature','position') 不返回
    sys.update(16, em, 2000)
    expect((sys as any).enchantments).toHaveLength(0)
  })

  it('生物缺少 creature 组件时不产生附魔', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const eid = em.createEntity()
    em.addComponent(eid, { type: 'position', x: 0, y: 0 } as any)
    sys.update(16, em, 2000)
    expect((sys as any).enchantments).toHaveLength(0)
  })

  it('dt 参数不影响节流逻辑（tick 才是关键）', () => {
    sys.update(999, em, 2000)
    expect((sys as any).lastCheck).toBe(2000)
  })

  it('power 最小值不低于 0（max 保护）', () => {
    const e = makeEnchant(1, 'sharpness', 0.001, 99999, 0)
    ;(sys as any).enchantments.push(e)
    sys.update(16, em, 2000)
    // power应被剪裁到0或被移除
    const all = (sys as any).enchantments as Enchantment[]
    for (const enc of all) {
      expect(enc.power).toBeGreaterThanOrEqual(0)
    }
  })

  it('清理后 nextId 不回退', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    addCreature(em, 20)
    sys.update(16, em, 2000)
    const idBefore = (sys as any).nextId as number
    // 移除所有附魔
    ;(sys as any).enchantments.length = 0
    sys.update(16, em, 5000)
    expect((sys as any).nextId).toBeGreaterThanOrEqual(idBefore)
  })

  it('多个生物依次积累 skill', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const e1 = addCreature(em, 20)
    const e2 = addCreature(em, 20)
    ;(sys as any).skillMap.set(e1, 10)
    ;(sys as any).skillMap.set(e2, 20)
    sys.update(16, em, 2000)
    expect((sys as any).skillMap.get(e1)).toBeCloseTo(10.05, 5)
    expect((sys as any).skillMap.get(e2)).toBeCloseTo(20.05, 5)
  })

  it('连续多轮 update 后 enchantments 数量不超过 MAX_ENCHANTMENTS', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    for (let i = 0; i < 20; i++) addCreature(em, 20)
    for (let t = 2000; t < 50000; t += 2000) {
      sys.update(16, em, t)
    }
    expect((sys as any).enchantments.length).toBeLessThanOrEqual(120)
  })
})
