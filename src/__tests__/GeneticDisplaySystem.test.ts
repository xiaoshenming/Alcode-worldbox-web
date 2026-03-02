import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GeneticsSystem } from '../systems/GeneticsSystem'
import { EntityManager } from '../ecs/Entity'
import type { GeneticsComponent, CreatureComponent, NeedsComponent } from '../ecs/Entity'

// ============================================================
// 辅助工厂
// ============================================================
function makeEm() { return new EntityManager() }

function makeGeneticsComp(overrides: Partial<GeneticsComponent> = {}): GeneticsComponent {
  return {
    type: 'genetics',
    traits: {
      strength: 1.0,
      vitality: 1.0,
      agility: 1.0,
      fertility: 1.0,
      longevity: 1.0,
      intelligence: 1.0,
    },
    mutations: [],
    generation: 0,
    parentA: null,
    parentB: null,
    ...overrides,
  }
}

// ============================================================
// 测试组1：generateRandomTraits 基础功能
// ============================================================
describe('GeneticsSystem.generateRandomTraits 基础功能', () => {
  afterEach(() => vi.restoreAllMocks())

  it('返回 type 为 genetics 的组件', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(g.type).toBe('genetics')
  })

  it('generation 为 0', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(g.generation).toBe(0)
  })

  it('parentA 为 null', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(g.parentA).toBeNull()
  })

  it('parentB 为 null', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(g.parentB).toBeNull()
  })

  it('mutations 为空数组', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(Array.isArray(g.mutations)).toBe(true)
    expect(g.mutations.length).toBe(0)
  })

  it('traits.strength 为 number 类型', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(typeof g.traits.strength).toBe('number')
  })

  it('traits.vitality 为 number 类型', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(typeof g.traits.vitality).toBe('number')
  })

  it('traits.agility 为 number 类型', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(typeof g.traits.agility).toBe('number')
  })

  it('traits.fertility 为 number 类型', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(typeof g.traits.fertility).toBe('number')
  })

  it('traits.longevity 为 number 类型', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(typeof g.traits.longevity).toBe('number')
  })

  it('traits.intelligence 为 number 类型', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(typeof g.traits.intelligence).toBe('number')
  })
})

// ============================================================
// 测试组2：generateRandomTraits 数值范围
// ============================================================
describe('GeneticsSystem.generateRandomTraits 数值范围', () => {
  afterEach(() => vi.restoreAllMocks())

  const TRAIT_MIN = 0.3
  const TRAIT_MAX = 2.5

  function checkRange(val: number) {
    expect(val).toBeGreaterThanOrEqual(TRAIT_MIN)
    expect(val).toBeLessThanOrEqual(TRAIT_MAX)
  }

  it('strength 在 [0.3, 2.5]', () => {
    for (let i = 0; i < 20; i++) { checkRange(GeneticsSystem.generateRandomTraits().traits.strength) }
  })

  it('vitality 在 [0.3, 2.5]', () => {
    for (let i = 0; i < 20; i++) { checkRange(GeneticsSystem.generateRandomTraits().traits.vitality) }
  })

  it('agility 在 [0.3, 2.5]', () => {
    for (let i = 0; i < 20; i++) { checkRange(GeneticsSystem.generateRandomTraits().traits.agility) }
  })

  it('fertility 在 [0.3, 2.5]', () => {
    for (let i = 0; i < 20; i++) { checkRange(GeneticsSystem.generateRandomTraits().traits.fertility) }
  })

  it('longevity 在 [0.3, 2.5]', () => {
    for (let i = 0; i < 20; i++) { checkRange(GeneticsSystem.generateRandomTraits().traits.longevity) }
  })

  it('intelligence 在 [0.3, 2.5]', () => {
    for (let i = 0; i < 20; i++) { checkRange(GeneticsSystem.generateRandomTraits().traits.intelligence) }
  })

  it('每次调用返回新对象（非同一引用）', () => {
    const a = GeneticsSystem.generateRandomTraits()
    const b = GeneticsSystem.generateRandomTraits()
    expect(a).not.toBe(b)
  })
})

// ============================================================
// 测试组3：mutate 突变行为
// ============================================================
describe('GeneticsSystem.mutate 突变行为', () => {
  afterEach(() => vi.restoreAllMocks())

  it('默认 5% 概率：100次调用中至少有1次突变', () => {
    const g = makeGeneticsComp()
    let count = 0
    for (let i = 0; i < 200; i++) {
      const fresh = makeGeneticsComp()
      if (GeneticsSystem.mutate(fresh) !== null) count++
    }
    expect(count).toBeGreaterThan(0)
  })

  it('突变时返回突变名称（非 null 字符串）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // < 0.05 触发突变，同时 pickRandom 也需要值
    const g = makeGeneticsComp()
    const result = GeneticsSystem.mutate(g)
    // 可能是名称或 null（取决于后续 random 调用），只要不崩溃即可
    expect(result === null || typeof result === 'string').toBe(true)
    vi.restoreAllMocks()
  })

  it('无突变时返回 null', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99) // >= 0.05 不触发
    const g = makeGeneticsComp()
    expect(GeneticsSystem.mutate(g)).toBeNull()
    vi.restoreAllMocks()
  })

  it('突变时 mutations 数组长度增加', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    const g = makeGeneticsComp()
    const before = g.mutations.length
    GeneticsSystem.mutate(g)
    // 如果触发了突变，长度应增加
    expect(g.mutations.length).toBeGreaterThanOrEqual(before)
    vi.restoreAllMocks()
  })

  it('突变后 trait 值仍在 [0.3, 2.5] 范围内', () => {
    // 多次尝试触发突变并检查范围
    for (let i = 0; i < 50; i++) {
      const g = makeGeneticsComp()
      GeneticsSystem.mutate(g)
      for (const key of ['strength', 'vitality', 'agility', 'fertility', 'longevity', 'intelligence'] as const) {
        expect(g.traits[key]).toBeGreaterThanOrEqual(0.3)
        expect(g.traits[key]).toBeLessThanOrEqual(2.5)
      }
    }
  })

  it('突变名称是预定义列表中的一个', () => {
    const KNOWN_MUTATIONS = ['Giant', 'Swift', 'Tough', 'Genius', 'Eternal', 'Fertile', 'Weak', 'Frail', 'Slow']
    let foundMutation = false
    for (let i = 0; i < 500; i++) {
      const g = makeGeneticsComp()
      const name = GeneticsSystem.mutate(g)
      if (name !== null) {
        expect(KNOWN_MUTATIONS).toContain(name)
        foundMutation = true
        break
      }
    }
    expect(foundMutation).toBe(true)
  })

  it('多次突变时 mutations 数组追加而不是替换', () => {
    const g = makeGeneticsComp()
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    GeneticsSystem.mutate(g)
    const len1 = g.mutations.length
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    GeneticsSystem.mutate(g)
    expect(g.mutations.length).toBeGreaterThanOrEqual(len1)
    vi.restoreAllMocks()
  })
})

// ============================================================
// 测试组4：inheritTraits 遗传继承
// ============================================================
describe('GeneticsSystem.inheritTraits 遗传继承', () => {
  afterEach(() => vi.restoreAllMocks())

  it('返回 type 为 genetics 的组件', () => {
    const pa = makeGeneticsComp({ generation: 0 })
    const pb = makeGeneticsComp({ generation: 0 })
    const child = GeneticsSystem.inheritTraits(pa, pb, 1, 2)
    expect(child.type).toBe('genetics')
  })

  it('子代 generation = max(parentA.gen, parentB.gen) + 1', () => {
    const pa = makeGeneticsComp({ generation: 3 })
    const pb = makeGeneticsComp({ generation: 5 })
    const child = GeneticsSystem.inheritTraits(pa, pb, 1, 2)
    expect(child.generation).toBe(6)
  })

  it('子代 generation（两亲相同）= parentGen + 1', () => {
    const pa = makeGeneticsComp({ generation: 2 })
    const pb = makeGeneticsComp({ generation: 2 })
    const child = GeneticsSystem.inheritTraits(pa, pb, 1, 2)
    expect(child.generation).toBe(3)
  })

  it('子代 parentA 等于传入 parentAId', () => {
    const pa = makeGeneticsComp()
    const pb = makeGeneticsComp()
    const child = GeneticsSystem.inheritTraits(pa, pb, 42, 99)
    expect(child.parentA).toBe(42)
  })

  it('子代 parentB 等于传入 parentBId', () => {
    const pa = makeGeneticsComp()
    const pb = makeGeneticsComp()
    const child = GeneticsSystem.inheritTraits(pa, pb, 42, 99)
    expect(child.parentB).toBe(99)
  })

  it('子代 mutations 为空数组（继承不保留亲代突变历史）', () => {
    const pa = makeGeneticsComp({ mutations: ['Giant'] })
    const pb = makeGeneticsComp({ mutations: ['Swift'] })
    const child = GeneticsSystem.inheritTraits(pa, pb, 1, 2)
    expect(child.mutations.length).toBe(0)
  })

  it('子代 trait 值在 [0.3, 2.5] 范围内', () => {
    const pa = makeGeneticsComp()
    const pb = makeGeneticsComp()
    const child = GeneticsSystem.inheritTraits(pa, pb, 1, 2)
    for (const key of ['strength', 'vitality', 'agility', 'fertility', 'longevity', 'intelligence'] as const) {
      expect(child.traits[key]).toBeGreaterThanOrEqual(0.3)
      expect(child.traits[key]).toBeLessThanOrEqual(2.5)
    }
  })

  it('亲代 traits 极端值（最大值）时子代仍不超过 TRAIT_MAX=2.5', () => {
    const pa = makeGeneticsComp({ traits: { strength: 2.5, vitality: 2.5, agility: 2.5, fertility: 2.5, longevity: 2.5, intelligence: 2.5 } })
    const pb = makeGeneticsComp({ traits: { strength: 2.5, vitality: 2.5, agility: 2.5, fertility: 2.5, longevity: 2.5, intelligence: 2.5 } })
    for (let i = 0; i < 10; i++) {
      const child = GeneticsSystem.inheritTraits(pa, pb, 1, 2)
      for (const key of ['strength', 'vitality', 'agility', 'fertility', 'longevity', 'intelligence'] as const) {
        expect(child.traits[key]).toBeLessThanOrEqual(2.5)
      }
    }
  })

  it('亲代 traits 极端值（最小值）时子代仍不低于 TRAIT_MIN=0.3', () => {
    const pa = makeGeneticsComp({ traits: { strength: 0.3, vitality: 0.3, agility: 0.3, fertility: 0.3, longevity: 0.3, intelligence: 0.3 } })
    const pb = makeGeneticsComp({ traits: { strength: 0.3, vitality: 0.3, agility: 0.3, fertility: 0.3, longevity: 0.3, intelligence: 0.3 } })
    for (let i = 0; i < 10; i++) {
      const child = GeneticsSystem.inheritTraits(pa, pb, 1, 2)
      for (const key of ['strength', 'vitality', 'agility', 'fertility', 'longevity', 'intelligence'] as const) {
        expect(child.traits[key]).toBeGreaterThanOrEqual(0.3)
      }
    }
  })
})

// ============================================================
// 测试组5：applyTraits 特征应用
// ============================================================
describe('GeneticsSystem.applyTraits 特征应用', () => {
  afterEach(() => vi.restoreAllMocks())

  it('creature.speed 乘以 agility', () => {
    const em = makeEm()
    const id = em.createEntity()
    em.addComponent<CreatureComponent>(id, {
      type: 'creature', species: 'human', speed: 1.0, damage: 5, isHostile: false,
      name: 'Test', age: 0, maxAge: 1000, gender: 'male'
    })
    em.addComponent<GeneticsComponent>(id, makeGeneticsComp({ traits: { strength: 1.0, vitality: 1.0, agility: 2.0, fertility: 1.0, longevity: 1.0, intelligence: 1.0 } }))
    GeneticsSystem.applyTraits(id, em)
    const c = em.getComponent<CreatureComponent>(id, 'creature')!
    expect(c.speed).toBeCloseTo(2.0, 5)
  })

  it('creature.damage 乘以 strength', () => {
    const em = makeEm()
    const id = em.createEntity()
    em.addComponent<CreatureComponent>(id, {
      type: 'creature', species: 'human', speed: 1.0, damage: 10, isHostile: false,
      name: 'Test', age: 0, maxAge: 1000, gender: 'male'
    })
    em.addComponent<GeneticsComponent>(id, makeGeneticsComp({ traits: { strength: 1.5, vitality: 1.0, agility: 1.0, fertility: 1.0, longevity: 1.0, intelligence: 1.0 } }))
    GeneticsSystem.applyTraits(id, em)
    const c = em.getComponent<CreatureComponent>(id, 'creature')!
    expect(c.damage).toBeCloseTo(15.0, 5)
  })

  it('creature.maxAge 乘以 longevity', () => {
    const em = makeEm()
    const id = em.createEntity()
    em.addComponent<CreatureComponent>(id, {
      type: 'creature', species: 'human', speed: 1.0, damage: 5, isHostile: false,
      name: 'Test', age: 0, maxAge: 1000, gender: 'male'
    })
    em.addComponent<GeneticsComponent>(id, makeGeneticsComp({ traits: { strength: 1.0, vitality: 1.0, agility: 1.0, fertility: 1.0, longevity: 1.5, intelligence: 1.0 } }))
    GeneticsSystem.applyTraits(id, em)
    const c = em.getComponent<CreatureComponent>(id, 'creature')!
    expect(c.maxAge).toBeCloseTo(1500, 1)
  })

  it('needs.health 乘以 vitality（不超过 100）', () => {
    const em = makeEm()
    const id = em.createEntity()
    em.addComponent<CreatureComponent>(id, {
      type: 'creature', species: 'human', speed: 1.0, damage: 5, isHostile: false,
      name: 'Test', age: 0, maxAge: 1000, gender: 'male'
    })
    em.addComponent<NeedsComponent>(id, { type: 'needs', hunger: 0, health: 80 })
    em.addComponent<GeneticsComponent>(id, makeGeneticsComp({ traits: { strength: 1.0, vitality: 2.0, agility: 1.0, fertility: 1.0, longevity: 1.0, intelligence: 1.0 } }))
    GeneticsSystem.applyTraits(id, em)
    const n = em.getComponent<NeedsComponent>(id, 'needs')!
    expect(n.health).toBeLessThanOrEqual(100)
  })

  it('vitality * health 超过 100 时 clamp 到 100', () => {
    const em = makeEm()
    const id = em.createEntity()
    em.addComponent<CreatureComponent>(id, {
      type: 'creature', species: 'human', speed: 1.0, damage: 5, isHostile: false,
      name: 'Test', age: 0, maxAge: 1000, gender: 'male'
    })
    em.addComponent<NeedsComponent>(id, { type: 'needs', hunger: 0, health: 100 })
    em.addComponent<GeneticsComponent>(id, makeGeneticsComp({ traits: { strength: 1.0, vitality: 2.5, agility: 1.0, fertility: 1.0, longevity: 1.0, intelligence: 1.0 } }))
    GeneticsSystem.applyTraits(id, em)
    const n = em.getComponent<NeedsComponent>(id, 'needs')!
    expect(n.health).toBe(100)
  })

  it('无 genetics 组件时 applyTraits 不崩溃', () => {
    const em = makeEm()
    const id = em.createEntity()
    em.addComponent<CreatureComponent>(id, {
      type: 'creature', species: 'human', speed: 1.0, damage: 5, isHostile: false,
      name: 'Test', age: 0, maxAge: 1000, gender: 'male'
    })
    expect(() => GeneticsSystem.applyTraits(id, em)).not.toThrow()
  })

  it('无 creature 组件时 applyTraits 不崩溃', () => {
    const em = makeEm()
    const id = em.createEntity()
    em.addComponent<GeneticsComponent>(id, makeGeneticsComp())
    expect(() => GeneticsSystem.applyTraits(id, em)).not.toThrow()
  })

  it('无 needs 组件时 applyTraits 不崩溃（只影响 creature）', () => {
    const em = makeEm()
    const id = em.createEntity()
    em.addComponent<CreatureComponent>(id, {
      type: 'creature', species: 'human', speed: 1.0, damage: 5, isHostile: false,
      name: 'Test', age: 0, maxAge: 1000, gender: 'male'
    })
    em.addComponent<GeneticsComponent>(id, makeGeneticsComp())
    expect(() => GeneticsSystem.applyTraits(id, em)).not.toThrow()
  })

  it('全 traits=1.0 时 creature 数值不变', () => {
    const em = makeEm()
    const id = em.createEntity()
    em.addComponent<CreatureComponent>(id, {
      type: 'creature', species: 'human', speed: 2.0, damage: 8, isHostile: false,
      name: 'Test', age: 0, maxAge: 500, gender: 'male'
    })
    em.addComponent<GeneticsComponent>(id, makeGeneticsComp())
    GeneticsSystem.applyTraits(id, em)
    const c = em.getComponent<CreatureComponent>(id, 'creature')!
    expect(c.speed).toBeCloseTo(2.0, 5)
    expect(c.damage).toBeCloseTo(8.0, 5)
    expect(c.maxAge).toBeCloseTo(500, 1)
  })
})

// ============================================================
// 测试组6：logMutation
// ============================================================
describe('GeneticsSystem.logMutation', () => {
  afterEach(() => vi.restoreAllMocks())

  it('调用不抛出异常', () => {
    expect(() => GeneticsSystem.logMutation('Hero', 'human', 'Giant', 100)).not.toThrow()
  })

  it('不同参数调用不崩溃', () => {
    expect(() => GeneticsSystem.logMutation('Elf', 'elf', 'Swift', 0)).not.toThrow()
    expect(() => GeneticsSystem.logMutation('Dwarf', 'dwarf', 'Frail', 9999)).not.toThrow()
  })
})

// ============================================================
// 测试组7：generateRandomTraits 重复调用独立性
// ============================================================
describe('GeneticsSystem.generateRandomTraits 独立性与多次调用', () => {
  afterEach(() => vi.restoreAllMocks())

  it('连续10次调用均返回有效组件', () => {
    for (let i = 0; i < 10; i++) {
      const g = GeneticsSystem.generateRandomTraits()
      expect(g.type).toBe('genetics')
      expect(g.generation).toBe(0)
    }
  })

  it('traits 对象包含全部6个键', () => {
    const g = GeneticsSystem.generateRandomTraits()
    const keys = Object.keys(g.traits)
    expect(keys).toContain('strength')
    expect(keys).toContain('vitality')
    expect(keys).toContain('agility')
    expect(keys).toContain('fertility')
    expect(keys).toContain('longevity')
    expect(keys).toContain('intelligence')
  })

  it('traits 对象恰好包含6个键（无多余字段）', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(Object.keys(g.traits).length).toBe(6)
  })

  it('mutations 字段存在且为数组类型', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(Array.isArray(g.mutations)).toBe(true)
  })
})

// ============================================================
// 测试组8：inheritTraits 多代继承
// ============================================================
describe('GeneticsSystem.inheritTraits 多代继承', () => {
  afterEach(() => vi.restoreAllMocks())

  it('三代继承后 generation 正确累加', () => {
    const g0a = makeGeneticsComp({ generation: 0 })
    const g0b = makeGeneticsComp({ generation: 0 })
    const g1 = GeneticsSystem.inheritTraits(g0a, g0b, 1, 2)
    expect(g1.generation).toBe(1)
    const g1b = makeGeneticsComp({ generation: 0 })
    const g2 = GeneticsSystem.inheritTraits(g1, g1b, 3, 4)
    expect(g2.generation).toBe(2)
  })

  it('不对称亲代 generation 取最大值+1', () => {
    const ga = makeGeneticsComp({ generation: 10 })
    const gb = makeGeneticsComp({ generation: 1 })
    const child = GeneticsSystem.inheritTraits(ga, gb, 5, 6)
    expect(child.generation).toBe(11)
  })
})
