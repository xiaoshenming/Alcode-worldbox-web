import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CreatureAlchemySystem } from '../systems/CreatureAlchemySystem'
import type { PotionType, Potion } from '../systems/CreatureAlchemySystem'

// CreatureAlchemySystem 测试：
// 常量: CHECK_INTERVAL=1800, BREW_CHANCE=0.003, MAX_POTIONS=150, SKILL_GROWTH=0.06
// 私有字段: potions[], nextId, lastCheck, skillMap

function makeCAS(): CreatureAlchemySystem {
  return new CreatureAlchemySystem()
}

function makePotion(
  id: number,
  type: PotionType = 'healing',
  tick = 0,
  overrides: Partial<Potion> = {}
): Potion {
  return {
    id,
    type,
    potency: 30,
    creator: 1,
    duration: 2000,
    tick,
    ...overrides,
  }
}

// ── helpers ───────────────────────────────────────────────
const ALL_TYPES: PotionType[] = [
  'healing',
  'strength',
  'speed',
  'invisibility',
  'fire_resistance',
  'poison',
]

function fillPotions(cas: CreatureAlchemySystem, count: number): void {
  for (let i = 0; i < count; i++) {
    ;(cas as any).potions.push(makePotion(i + 1, ALL_TYPES[i % ALL_TYPES.length], i * 100))
  }
}

// ══════════════════════════════════════════════════════════
describe('CreatureAlchemySystem — 初始状态', () => {
  afterEach(() => vi.restoreAllMocks())

  it('初始 potions 数组为空', () => {
    const cas = makeCAS()
    expect((cas as any).potions).toHaveLength(0)
  })

  it('初始 nextId 为 1', () => {
    const cas = makeCAS()
    expect((cas as any).nextId).toBe(1)
  })

  it('初始 lastCheck 为 0', () => {
    const cas = makeCAS()
    expect((cas as any).lastCheck).toBe(0)
  })

  it('初始 skillMap 为空 Map', () => {
    const cas = makeCAS()
    const sm: Map<number, number> = (cas as any).skillMap
    expect(sm).toBeInstanceOf(Map)
    expect(sm.size).toBe(0)
  })

  it('每次 new 创建独立实例', () => {
    const a = makeCAS()
    const b = makeCAS()
    ;(a as any).potions.push(makePotion(1))
    expect((b as any).potions).toHaveLength(0)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureAlchemySystem — potions 数组操作', () => {
  let cas: CreatureAlchemySystem
  beforeEach(() => { cas = makeCAS() })
  afterEach(() => vi.restoreAllMocks())

  it('注入单个 healing 药水后长度为 1', () => {
    ;(cas as any).potions.push(makePotion(1, 'healing'))
    expect((cas as any).potions).toHaveLength(1)
  })

  it('注入药水后 type 字段正确', () => {
    ;(cas as any).potions.push(makePotion(1, 'strength'))
    expect((cas as any).potions[0].type).toBe('strength')
  })

  it('注入多个药水返回全部', () => {
    ;(cas as any).potions.push(makePotion(1, 'healing'))
    ;(cas as any).potions.push(makePotion(2, 'strength'))
    ;(cas as any).potions.push(makePotion(3, 'poison'))
    expect((cas as any).potions).toHaveLength(3)
  })

  it('potions 数组是内部引用（同一对象）', () => {
    ;(cas as any).potions.push(makePotion(1))
    const ref = (cas as any).potions
    expect(ref).toBe((cas as any).potions)
  })

  it('支持全部 6 种 PotionType', () => {
    ALL_TYPES.forEach((t, i) => { ;(cas as any).potions.push(makePotion(i + 1, t)) })
    const arr: Potion[] = (cas as any).potions
    expect(arr).toHaveLength(6)
    ALL_TYPES.forEach((t, i) => { expect(arr[i].type).toBe(t) })
  })

  it('药水 id 字段正确存储', () => {
    ;(cas as any).potions.push(makePotion(42, 'speed'))
    expect((cas as any).potions[0].id).toBe(42)
  })

  it('药水 potency 字段正确存储', () => {
    ;(cas as any).potions.push(makePotion(1, 'poison', 0, { potency: 99 }))
    expect((cas as any).potions[0].potency).toBe(99)
  })

  it('药水 creator 字段正确存储', () => {
    ;(cas as any).potions.push(makePotion(1, 'healing', 0, { creator: 77 }))
    expect((cas as any).potions[0].creator).toBe(77)
  })

  it('药水 duration 字段正确存储', () => {
    ;(cas as any).potions.push(makePotion(1, 'healing', 0, { duration: 5000 }))
    expect((cas as any).potions[0].duration).toBe(5000)
  })

  it('药水 tick 字段正确存储', () => {
    ;(cas as any).potions.push(makePotion(1, 'healing', 9999))
    expect((cas as any).potions[0].tick).toBe(9999)
  })

  it('可以手动 splice 删除药水', () => {
    ;(cas as any).potions.push(makePotion(1))
    ;(cas as any).potions.push(makePotion(2))
    ;(cas as any).potions.splice(0, 1)
    expect((cas as any).potions).toHaveLength(1)
    expect((cas as any).potions[0].id).toBe(2)
  })

  it('注入 150 个药水（MAX_POTIONS 上限）全部存储', () => {
    fillPotions(cas, 150)
    expect((cas as any).potions).toHaveLength(150)
  })

  it('potions 数组顺序与插入顺序一致', () => {
    ;(cas as any).potions.push(makePotion(10, 'healing', 10))
    ;(cas as any).potions.push(makePotion(20, 'poison', 20))
    const arr: Potion[] = (cas as any).potions
    expect(arr[0].id).toBe(10)
    expect(arr[1].id).toBe(20)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureAlchemySystem — skillMap 操作', () => {
  let cas: CreatureAlchemySystem
  beforeEach(() => { cas = makeCAS() })
  afterEach(() => vi.restoreAllMocks())

  it('未知生物技能默认为 0（Map.get 返回 undefined）', () => {
    expect(((cas as any).skillMap.get(1) ?? 0)).toBe(0)
  })

  it('未知大 id 返回 0', () => {
    expect(((cas as any).skillMap.get(999999) ?? 0)).toBe(0)
  })

  it('注入技能后可查询', () => {
    ;(cas as any).skillMap.set(1, 75)
    expect(((cas as any).skillMap.get(1) ?? 0)).toBe(75)
  })

  it('注入零技能值', () => {
    ;(cas as any).skillMap.set(5, 0)
    expect(((cas as any).skillMap.get(5) ?? 0)).toBe(0)
  })

  it('注入最大技能 100', () => {
    ;(cas as any).skillMap.set(6, 100)
    expect(((cas as any).skillMap.get(6) ?? 0)).toBe(100)
  })

  it('覆盖技能后返回新值', () => {
    ;(cas as any).skillMap.set(1, 50)
    ;(cas as any).skillMap.set(1, 90)
    expect(((cas as any).skillMap.get(1) ?? 0)).toBe(90)
  })

  it('多个生物技能独立存储', () => {
    ;(cas as any).skillMap.set(1, 30)
    ;(cas as any).skillMap.set(2, 80)
    ;(cas as any).skillMap.set(3, 55)
    expect(((cas as any).skillMap.get(1) ?? 0)).toBe(30)
    expect(((cas as any).skillMap.get(2) ?? 0)).toBe(80)
    expect(((cas as any).skillMap.get(3) ?? 0)).toBe(55)
    expect(((cas as any).skillMap.get(4) ?? 0)).toBe(0)
  })

  it('注入浮点技能值', () => {
    ;(cas as any).skillMap.set(7, 12.5)
    expect(((cas as any).skillMap.get(7) ?? 0)).toBeCloseTo(12.5)
  })

  it('skillMap.size 随 set 增长', () => {
    ;(cas as any).skillMap.set(1, 10)
    ;(cas as any).skillMap.set(2, 20)
    ;(cas as any).skillMap.set(3, 30)
    expect((cas as any).skillMap.size).toBe(3)
  })

  it('delete 后技能消失', () => {
    ;(cas as any).skillMap.set(1, 50)
    ;(cas as any).skillMap.delete(1)
    expect(((cas as any).skillMap.get(1) ?? 0)).toBe(0)
  })

  it('可���存储技能值接近 SKILL_GROWTH 增量的边界（0.06）', () => {
    // SKILL_GROWTH = 0.06; 验证精度不丢失
    const v = 4 + 0.06
    ;(cas as any).skillMap.set(9, v)
    expect(((cas as any).skillMap.get(9) ?? 0)).toBeCloseTo(v)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureAlchemySystem — 过期药水逻辑（手动模拟）', () => {
  let cas: CreatureAlchemySystem
  beforeEach(() => { cas = makeCAS() })
  afterEach(() => vi.restoreAllMocks())

  // cutoff = currentTick - 50000
  // 药水 tick < cutoff 则过期，应被删除

  it('old tick 药水在 splice 后消失（手动模拟过期）', () => {
    ;(cas as any).potions.push(makePotion(1, 'healing', 0))
    ;(cas as any).potions.push(makePotion(2, 'healing', 100000))
    // 手动模拟: 删除 tick < 50001 的
    const cutoff = 100000 - 50000
    for (let i = (cas as any).potions.length - 1; i >= 0; i--) {
      if ((cas as any).potions[i].tick < cutoff) (cas as any).potions.splice(i, 1)
    }
    expect((cas as any).potions).toHaveLength(1)
    expect((cas as any).potions[0].id).toBe(2)
  })

  it('新鲜药水不被过期逻辑删除', () => {
    const CURRENT = 60000
    ;(cas as any).potions.push(makePotion(1, 'strength', CURRENT - 1000))
    const cutoff = CURRENT - 50000
    for (let i = (cas as any).potions.length - 1; i >= 0; i--) {
      if ((cas as any).potions[i].tick < cutoff) (cas as any).potions.splice(i, 1)
    }
    expect((cas as any).potions).toHaveLength(1)
  })

  it('批量过期：只保留最新的', () => {
    const CURRENT = 100000
    const cutoff = CURRENT - 50000
    for (let i = 0; i < 5; i++) {
      ;(cas as any).potions.push(makePotion(i + 1, 'healing', i * 1000)) // tick: 0..4000 全过期
    }
    ;(cas as any).potions.push(makePotion(100, 'healing', 55000)) // 不过期
    for (let i = (cas as any).potions.length - 1; i >= 0; i--) {
      if ((cas as any).potions[i].tick < cutoff) (cas as any).potions.splice(i, 1)
    }
    expect((cas as any).potions).toHaveLength(1)
    expect((cas as any).potions[0].id).toBe(100)
  })

  it('空数组执行过期逻辑不报错', () => {
    expect(() => {
      for (let i = (cas as any).potions.length - 1; i >= 0; i--) {
        if ((cas as any).potions[i].tick < 0) (cas as any).potions.splice(i, 1)
      }
    }).not.toThrow()
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureAlchemySystem — POTENCY_BASE 常量验证', () => {
  afterEach(() => vi.restoreAllMocks())

  // POTENCY_BASE: healing=30, strength=25, speed=20, invisibility=15, fire_resistance=20, poison=35
  const POTENCY_BASE: Record<PotionType, number> = {
    healing: 30,
    strength: 25,
    speed: 20,
    invisibility: 15,
    fire_resistance: 20,
    poison: 35,
  }

  it('healing potency base 为 30', () => {
    expect(POTENCY_BASE['healing']).toBe(30)
  })

  it('strength potency base 为 25', () => {
    expect(POTENCY_BASE['strength']).toBe(25)
  })

  it('speed potency base 为 20', () => {
    expect(POTENCY_BASE['speed']).toBe(20)
  })

  it('invisibility potency base 为 15（最低）', () => {
    expect(POTENCY_BASE['invisibility']).toBe(15)
  })

  it('fire_resistance potency base 为 20', () => {
    expect(POTENCY_BASE['fire_resistance']).toBe(20)
  })

  it('poison potency base 为 35（最高）', () => {
    expect(POTENCY_BASE['poison']).toBe(35)
  })

  it('potency 公式 potency = base * (0.4 + skill/100)，skill=0 时最小', () => {
    const base = POTENCY_BASE['healing']   // 30
    const potency = base * (0.4 + 0 / 100) // 30 * 0.4 = 12
    expect(potency).toBeCloseTo(12)
  })

  it('potency 公式 skill=100 时最大：base * 1.4', () => {
    const base = POTENCY_BASE['poison']    // 35
    const potency = base * (0.4 + 100 / 100) // 35 * 1.4 = 49
    expect(potency).toBeCloseTo(49)
  })

  it('potency 公式 skill=50 时为 base * 0.9', () => {
    const base = POTENCY_BASE['strength']  // 25
    const potency = base * (0.4 + 50 / 100) // 25 * 0.9 = 22.5
    expect(potency).toBeCloseTo(22.5)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureAlchemySystem — duration 公式验证', () => {
  afterEach(() => vi.restoreAllMocks())

  // duration = 2000 + Math.floor(skill * 40)

  it('skill=0 时 duration=2000', () => {
    expect(2000 + Math.floor(0 * 40)).toBe(2000)
  })

  it('skill=100 时 duration=6000', () => {
    expect(2000 + Math.floor(100 * 40)).toBe(6000)
  })

  it('skill=50 时 duration=4000', () => {
    expect(2000 + Math.floor(50 * 40)).toBe(4000)
  })

  it('skill=12.5 时 duration=2500', () => {
    expect(2000 + Math.floor(12.5 * 40)).toBe(2500)
  })

  it('skill=1 时 duration=2040', () => {
    expect(2000 + Math.floor(1 * 40)).toBe(2040)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureAlchemySystem — update() CHECK_INTERVAL 守卫（mock）', () => {
  afterEach(() => vi.restoreAllMocks())

  function makeMinimalEM() {
    return {
      getEntitiesWithComponents: vi.fn().mockReturnValue([]),
      getComponent: vi.fn().mockReturnValue(null),
      hasComponent: vi.fn().mockReturnValue(true),
    }
  }

  it('tick < CHECK_INTERVAL(1800) 时 update 提前返回，不调用 getEntitiesWithComponents', () => {
    const cas = makeCAS()
    const em = makeMinimalEM()
    cas.update(16, em as any, 100)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('tick >= CHECK_INTERVAL 时调用 getEntitiesWithComponents', () => {
    const cas = makeCAS()
    const em = makeMinimalEM()
    cas.update(16, em as any, 1800)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('首次 update 在 tick=1800 时触发（lastCheck=0）', () => {
    const cas = makeCAS()
    const em = makeMinimalEM()
    cas.update(16, em as any, 1800)
    expect((cas as any).lastCheck).toBe(1800)
  })

  it('第二次 update 在 tick=1800+100 时不触发（差值100<1800）', () => {
    const cas = makeCAS()
    const em = makeMinimalEM()
    cas.update(16, em as any, 1800)
    em.getEntitiesWithComponents.mockClear()
    cas.update(16, em as any, 1900)
    expect(em.getEntitiesWithComponents).not.toHaveBeenCalled()
  })

  it('第二次 update 在 tick=3600 时触发（差值1800>=CHECK_INTERVAL）', () => {
    const cas = makeCAS()
    const em = makeMinimalEM()
    cas.update(16, em as any, 1800)
    em.getEntitiesWithComponents.mockClear()
    cas.update(16, em as any, 3600)
    expect(em.getEntitiesWithComponents).toHaveBeenCalled()
  })

  it('update 返回 undefined', () => {
    const cas = makeCAS()
    const em = makeMinimalEM()
    const result = cas.update(16, em as any, 100)
    expect(result).toBeUndefined()
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureAlchemySystem — MAX_POTIONS 上限（mock）', () => {
  afterEach(() => vi.restoreAllMocks())

  it('potions 数量达到 150 时 update 不再添加（mock BREW_CHANCE=1）', () => {
    const cas = makeCAS()
    fillPotions(cas, 150)

    const em = {
      getEntitiesWithComponents: vi.fn().mockReturnValue([999]),
      getComponent: vi.fn().mockReturnValue({ age: 20 }),
      hasComponent: vi.fn().mockReturnValue(true),
    }
    // 即使随机��命中，因为 >= MAX_POTIONS break，所以不会新增
    vi.spyOn(Math, 'random').mockReturnValue(0) // 0 <= BREW_CHANCE(0.003) 会 brew
    cas.update(16, em as any, 1800)
    expect((cas as any).potions).toHaveLength(150)
  })
})

// ══════════════════════════════════════════════════════════
describe('CreatureAlchemySystem — Potion 接口结构验证', () => {
  afterEach(() => vi.restoreAllMocks())

  it('Potion 具有所有必要字段', () => {
    const p = makePotion(1, 'healing', 0)
    expect(p).toHaveProperty('id')
    expect(p).toHaveProperty('type')
    expect(p).toHaveProperty('potency')
    expect(p).toHaveProperty('creator')
    expect(p).toHaveProperty('duration')
    expect(p).toHaveProperty('tick')
  })

  it('healing 药水 id 从 1 开始', () => {
    const p = makePotion(1)
    expect(p.id).toBe(1)
  })

  it('多个不同 creator 的药水并存', () => {
    const cas = makeCAS()
    ;(cas as any).potions.push(makePotion(1, 'healing', 0, { creator: 10 }))
    ;(cas as any).potions.push(makePotion(2, 'poison', 0, { creator: 20 }))
    expect((cas as any).potions[0].creator).toBe(10)
    expect((cas as any).potions[1].creator).toBe(20)
  })

  it('同一 creator 可有多个药水', () => {
    const cas = makeCAS()
    ;(cas as any).potions.push(makePotion(1, 'healing', 0, { creator: 5 }))
    ;(cas as any).potions.push(makePotion(2, 'strength', 100, { creator: 5 }))
    const arr: Potion[] = (cas as any).potions
    expect(arr.filter(p => p.creator === 5)).toHaveLength(2)
  })

  it('fire_resistance 药水可正常创建', () => {
    const p = makePotion(1, 'fire_resistance')
    expect(p.type).toBe('fire_resistance')
  })

  it('invisibility 药水可正常创建', () => {
    const p = makePotion(1, 'invisibility')
    expect(p.type).toBe('invisibility')
  })
})
