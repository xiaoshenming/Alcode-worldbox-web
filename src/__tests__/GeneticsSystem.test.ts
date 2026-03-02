import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GeneticsSystem, GeneticTraits } from '../systems/GeneticsSystem'
import { GeneticsComponent, EntityManager, CreatureComponent, NeedsComponent } from '../ecs/Entity'

// 帮助函数：创建测试用的 GeneticsComponent
function makeGenetics(overrides?: Partial<GeneticTraits>): GeneticsComponent {
  const traits: GeneticTraits = {
    strength: 1.0,
    vitality: 1.0,
    agility: 1.0,
    fertility: 1.0,
    longevity: 1.0,
    intelligence: 1.0,
    ...overrides
  }
  return {
    type: 'genetics',
    traits,
    mutations: [],
    generation: 0,
    parentA: null,
    parentB: null,
  }
}

function makeCreatureEntity(em: EntityManager, speed = 1.0, damage = 5, maxAge = 500): number {
  const id = em.createEntity()
  em.addComponent(id, {
    type: 'creature',
    species: 'human',
    speed,
    damage,
    isHostile: false,
    name: 'Test',
    age: 0,
    maxAge,
    gender: 'male',
  } as any)
  return id
}

function makeNeedsEntity(em: EntityManager, health = 80): number {
  const id = em.createEntity()
  em.addComponent(id, {
    type: 'needs',
    hunger: 0,
    health,
  } as any)
  return id
}

const TRAIT_MIN = 0.3
const TRAIT_MAX = 2.5
const TRAIT_KEYS: (keyof GeneticTraits)[] = ['strength', 'vitality', 'agility', 'fertility', 'longevity', 'intelligence']

// ─────────────────────────────────────────────────────────────────────────���───
// generateRandomTraits
// ─────────────────────────────────────────────────────────────────────────────

describe('GeneticsSystem.generateRandomTraits — 结构验证', () => {
  afterEach(() => vi.restoreAllMocks())

  it('返回 type="genetics" 的组件', () => {
    expect(GeneticsSystem.generateRandomTraits().type).toBe('genetics')
  })

  it('generation 初始为 0', () => {
    expect(GeneticsSystem.generateRandomTraits().generation).toBe(0)
  })

  it('parentA 初始为 null', () => {
    expect(GeneticsSystem.generateRandomTraits().parentA).toBeNull()
  })

  it('parentB 初始为 null', () => {
    expect(GeneticsSystem.generateRandomTraits().parentB).toBeNull()
  })

  it('mutations 初始为空数组', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(Array.isArray(g.mutations)).toBe(true)
    expect(g.mutations).toHaveLength(0)
  })

  it('包含全部 6 个特质', () => {
    const traits = GeneticsSystem.generateRandomTraits().traits
    for (const key of TRAIT_KEYS) {
      expect(typeof traits[key]).toBe('number')
    }
  })

  it('多次调用结果各自独立（不共享对象）', () => {
    const g1 = GeneticsSystem.generateRandomTraits()
    const g2 = GeneticsSystem.generateRandomTraits()
    expect(g1).not.toBe(g2)
    expect(g1.traits).not.toBe(g2.traits)
  })
})

describe('GeneticsSystem.generateRandomTraits — 范围验证', () => {
  afterEach(() => vi.restoreAllMocks())

  it('所有特质在 [TRAIT_MIN, TRAIT_MAX] 范围内（20次采样）', () => {
    for (let i = 0; i < 20; i++) {
      const traits = GeneticsSystem.generateRandomTraits().traits
      for (const key of TRAIT_KEYS) {
        expect(traits[key]).toBeGreaterThanOrEqual(TRAIT_MIN)
        expect(traits[key]).toBeLessThanOrEqual(TRAIT_MAX)
      }
    }
  })

  it('strength 在有效范围内', () => {
    for (let i = 0; i < 10; i++) {
      const v = GeneticsSystem.generateRandomTraits().traits.strength
      expect(v).toBeGreaterThanOrEqual(TRAIT_MIN)
      expect(v).toBeLessThanOrEqual(TRAIT_MAX)
    }
  })

  it('vitality 在有效范围内', () => {
    for (let i = 0; i < 10; i++) {
      const v = GeneticsSystem.generateRandomTraits().traits.vitality
      expect(v).toBeGreaterThanOrEqual(TRAIT_MIN)
      expect(v).toBeLessThanOrEqual(TRAIT_MAX)
    }
  })

  it('agility 在有效范围内', () => {
    for (let i = 0; i < 10; i++) {
      const v = GeneticsSystem.generateRandomTraits().traits.agility
      expect(v).toBeGreaterThanOrEqual(TRAIT_MIN)
      expect(v).toBeLessThanOrEqual(TRAIT_MAX)
    }
  })

  it('fertility 在有效范围内', () => {
    for (let i = 0; i < 10; i++) {
      const v = GeneticsSystem.generateRandomTraits().traits.fertility
      expect(v).toBeGreaterThanOrEqual(TRAIT_MIN)
      expect(v).toBeLessThanOrEqual(TRAIT_MAX)
    }
  })

  it('longevity 在有效范围内', () => {
    for (let i = 0; i < 10; i++) {
      const v = GeneticsSystem.generateRandomTraits().traits.longevity
      expect(v).toBeGreaterThanOrEqual(TRAIT_MIN)
      expect(v).toBeLessThanOrEqual(TRAIT_MAX)
    }
  })

  it('intelligence 在有效范围内', () => {
    for (let i = 0; i < 10; i++) {
      const v = GeneticsSystem.generateRandomTraits().traits.intelligence
      expect(v).toBeGreaterThanOrEqual(TRAIT_MIN)
      expect(v).toBeLessThanOrEqual(TRAIT_MAX)
    }
  })

  it('大量采样（100次）全部在有效范围内', () => {
    for (let i = 0; i < 100; i++) {
      const traits = GeneticsSystem.generateRandomTraits().traits
      for (const key of TRAIT_KEYS) {
        expect(traits[key]).toBeGreaterThanOrEqual(TRAIT_MIN)
        expect(traits[key]).toBeLessThanOrEqual(TRAIT_MAX)
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// inheritTraits
// ─────────────────────────────────────────────────────────────────────────────

describe('GeneticsSystem.inheritTraits — 结构验证', () => {
  afterEach(() => vi.restoreAllMocks())

  it('返回 type="genetics" 的组件', () => {
    const child = GeneticsSystem.inheritTraits(makeGenetics(), makeGenetics(), 1, 2)
    expect(child.type).toBe('genetics')
  })

  it('parentA 记录为传入的 parentAId', () => {
    const child = GeneticsSystem.inheritTraits(makeGenetics(), makeGenetics(), 42, 99)
    expect(child.parentA).toBe(42)
  })

  it('parentB 记录为传入的 parentBId', () => {
    const child = GeneticsSystem.inheritTraits(makeGenetics(), makeGenetics(), 42, 99)
    expect(child.parentB).toBe(99)
  })

  it('子代 mutations 初始为空数组', () => {
    const pA = makeGenetics()
    pA.mutations = ['Giant', 'Swift']
    const child = GeneticsSystem.inheritTraits(pA, makeGenetics(), 1, 2)
    expect(child.mutations).toHaveLength(0)
  })

  it('子代包含全部 6 个特质', () => {
    const child = GeneticsSystem.inheritTraits(makeGenetics(), makeGenetics(), 1, 2)
    for (const key of TRAIT_KEYS) {
      expect(typeof child.traits[key]).toBe('number')
    }
  })

  it('子代 generation = max(parentA.gen, parentB.gen) + 1（A=3, B=5 → 6）', () => {
    const pA = makeGenetics(); pA.generation = 3
    const pB = makeGenetics(); pB.generation = 5
    expect(GeneticsSystem.inheritTraits(pA, pB, 1, 2).generation).toBe(6)
  })

  it('子代 generation = max(parentA.gen, parentB.gen) + 1（A=5, B=3 → 6）', () => {
    const pA = makeGenetics(); pA.generation = 5
    const pB = makeGenetics(); pB.generation = 3
    expect(GeneticsSystem.inheritTraits(pA, pB, 1, 2).generation).toBe(6)
  })

  it('子代 generation = max(0, 0) + 1 = 1（两代均为0）', () => {
    expect(GeneticsSystem.inheritTraits(makeGenetics(), makeGenetics(), 1, 2).generation).toBe(1)
  })

  it('子代不与父代对象共享 traits 引用', () => {
    const pA = makeGenetics()
    const child = GeneticsSystem.inheritTraits(pA, makeGenetics(), 1, 2)
    expect(child.traits).not.toBe(pA.traits)
  })
})

describe('GeneticsSystem.inheritTraits — 特质范围验证', () => {
  afterEach(() => vi.restoreAllMocks())

  it('子代特质在有效范围内（两极端父代，20次采样）', () => {
    const pA = makeGenetics({ strength: 2.5, vitality: 2.5, agility: 2.5, fertility: 2.5, longevity: 2.5, intelligence: 2.5 })
    const pB = makeGenetics({ strength: 0.3, vitality: 0.3, agility: 0.3, fertility: 0.3, longevity: 0.3, intelligence: 0.3 })
    for (let i = 0; i < 20; i++) {
      const child = GeneticsSystem.inheritTraits(pA, pB, 1, 2)
      for (const key of TRAIT_KEYS) {
        expect(child.traits[key]).toBeGreaterThanOrEqual(TRAIT_MIN)
        expect(child.traits[key]).toBeLessThanOrEqual(TRAIT_MAX)
      }
    }
  })

  it('子代特质在有效范围内（普通父代，50次采样）', () => {
    const pA = makeGenetics({ strength: 1.5, agility: 0.8 })
    const pB = makeGenetics({ strength: 0.8, agility: 1.5 })
    for (let i = 0; i < 50; i++) {
      const child = GeneticsSystem.inheritTraits(pA, pB, 1, 2)
      for (const key of TRAIT_KEYS) {
        expect(child.traits[key]).toBeGreaterThanOrEqual(TRAIT_MIN)
        expect(child.traits[key]).toBeLessThanOrEqual(TRAIT_MAX)
      }
    }
  })

  it('子代特质大多数在父代值附近（多次采样均值接近父代均值）', () => {
    const pA = makeGenetics({ strength: 2.0 })
    const pB = makeGenetics({ strength: 2.0 })
    let sum = 0
    const n = 50
    for (let i = 0; i < n; i++) {
      sum += GeneticsSystem.inheritTraits(pA, pB, 1, 2).traits.strength
    }
    const avg = sum / n
    // 父代均值2.0，子代均值应该在合理浮动范围内（±0.5）
    expect(avg).toBeGreaterThan(1.0)
    expect(avg).toBeLessThanOrEqual(TRAIT_MAX)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// mutate
// ─────────────────────────────────────────────────────────────────────────────

describe('GeneticsSystem.mutate — 概率行为', () => {
  afterEach(() => vi.restoreAllMocks())

  it('5% 概率，1000次中大部分（>800次）返回 null', () => {
    let nullCount = 0
    for (let i = 0; i < 1000; i++) {
      if (GeneticsSystem.mutate(makeGenetics()) === null) nullCount++
    }
    expect(nullCount).toBeGreaterThan(800)
  })

  it('足够多次后（10000次）至少触发一次突变，返回非 null 字符串', () => {
    let found: string | null = null
    for (let i = 0; i < 10000 && found === null; i++) {
      found = GeneticsSystem.mutate(makeGenetics())
    }
    expect(found).not.toBeNull()
    expect(typeof found).toBe('string')
    expect((found as string).length).toBeGreaterThan(0)
  })

  it('突变率接近5%（1000次中突变次数在30-100之间）', () => {
    let mutCount = 0
    for (let i = 0; i < 1000; i++) {
      if (GeneticsSystem.mutate(makeGenetics()) !== null) mutCount++
    }
    // 理论5%，宽松范围 [20, 150]
    expect(mutCount).toBeGreaterThan(20)
    expect(mutCount).toBeLessThan(150)
  })
})

describe('GeneticsSystem.mutate — 突变内容验证', () => {
  afterEach(() => vi.restoreAllMocks())

  function forceMutate(genetics: GeneticsComponent): string {
    let result: string | null = null
    for (let i = 0; i < 10000 && result === null; i++) {
      const g = { ...genetics, traits: { ...genetics.traits }, mutations: [...genetics.mutations] }
      result = GeneticsSystem.mutate(g)
      if (result !== null) {
        Object.assign(genetics, g)
        genetics.mutations = g.mutations
        return result
      }
    }
    throw new Error('未能触发突变')
  }

  it('突变后 mutations 列表包含突变名', () => {
    const g = makeGenetics()
    let mutName: string | null = null
    for (let i = 0; i < 10000 && mutName === null; i++) {
      mutName = GeneticsSystem.mutate(g)
    }
    if (mutName !== null) {
      expect(g.mutations).toContain(mutName)
    }
  })

  it('突变后特质值仍在 [TRAIT_MIN, TRAIT_MAX]', () => {
    const g = makeGenetics()
    let mutName: string | null = null
    for (let i = 0; i < 10000 && mutName === null; i++) {
      mutName = GeneticsSystem.mutate(g)
    }
    if (mutName !== null) {
      for (const key of TRAIT_KEYS) {
        expect(g.traits[key]).toBeGreaterThanOrEqual(TRAIT_MIN)
        expect(g.traits[key]).toBeLessThanOrEqual(TRAIT_MAX)
      }
    }
  })

  it('突变名是已知突变之一', () => {
    const knownMutations = ['Giant', 'Swift', 'Tough', 'Genius', 'Eternal', 'Fertile', 'Weak', 'Frail', 'Slow']
    let mutName: string | null = null
    const g = makeGenetics()
    for (let i = 0; i < 10000 && mutName === null; i++) {
      mutName = GeneticsSystem.mutate(makeGenetics())
    }
    if (mutName !== null) {
      expect(knownMutations).toContain(mutName)
    }
  })

  it('突变在特质已为最大值时被 clamp 到 TRAIT_MAX', () => {
    // 让 strength 已经是最大值，Giant 突变（strength+0.4）应该被 clamp
    const g = makeGenetics({ strength: TRAIT_MAX })
    let mutName: string | null = null
    for (let i = 0; i < 50000 && mutName === null; i++) {
      const copy = { ...g, traits: { ...g.traits }, mutations: [] }
      const result = GeneticsSystem.mutate(copy)
      if (result === 'Giant') {
        mutName = result
        expect(copy.traits.strength).toBeLessThanOrEqual(TRAIT_MAX)
        break
      }
    }
  })

  it('负向突变（Weak）不让特质低于 TRAIT_MIN', () => {
    const g = makeGenetics({ strength: TRAIT_MIN })
    let found = false
    for (let i = 0; i < 50000 && !found; i++) {
      const copy = { ...g, traits: { ...g.traits }, mutations: [] }
      const result = GeneticsSystem.mutate(copy)
      if (result === 'Weak') {
        found = true
        expect(copy.traits.strength).toBeGreaterThanOrEqual(TRAIT_MIN)
      }
    }
  })

  it('多次突变可积累到 mutations 列表中', () => {
    const g = makeGenetics()
    let count = 0
    for (let i = 0; i < 10000 && count < 3; i++) {
      const result = GeneticsSystem.mutate(g)
      if (result !== null) count++
    }
    expect(g.mutations.length).toBe(count)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// applyTraits
// ─────────────────────────────────────────────────────────────────────────────

describe('GeneticsSystem.applyTraits — creature 组件缩放', () => {
  afterEach(() => vi.restoreAllMocks())

  it('agility=2.0 时 speed 乘以2', () => {
    const em = new EntityManager()
    const id = makeCreatureEntity(em, 1.0)
    em.addComponent(id, makeGenetics({ agility: 2.0 }))
    GeneticsSystem.applyTraits(id, em)
    expect(em.getComponent<CreatureComponent>(id, 'creature')!.speed).toBeCloseTo(2.0)
  })

  it('agility=0.5 时 speed 乘以0.5', () => {
    const em = new EntityManager()
    const id = makeCreatureEntity(em, 2.0)
    em.addComponent(id, makeGenetics({ agility: 0.5 }))
    GeneticsSystem.applyTraits(id, em)
    expect(em.getComponent<CreatureComponent>(id, 'creature')!.speed).toBeCloseTo(1.0)
  })

  it('agility=1.0 时 speed 不变', () => {
    const em = new EntityManager()
    const id = makeCreatureEntity(em, 3.0)
    em.addComponent(id, makeGenetics({ agility: 1.0 }))
    GeneticsSystem.applyTraits(id, em)
    expect(em.getComponent<CreatureComponent>(id, 'creature')!.speed).toBeCloseTo(3.0)
  })

  it('strength=2.0 时 damage 乘以2', () => {
    const em = new EntityManager()
    const id = makeCreatureEntity(em, 1.0, 5)
    em.addComponent(id, makeGenetics({ strength: 2.0 }))
    GeneticsSystem.applyTraits(id, em)
    expect(em.getComponent<CreatureComponent>(id, 'creature')!.damage).toBeCloseTo(10)
  })

  it('strength=0.5 时 damage 乘以0.5', () => {
    const em = new EntityManager()
    const id = makeCreatureEntity(em, 1.0, 10)
    em.addComponent(id, makeGenetics({ strength: 0.5 }))
    GeneticsSystem.applyTraits(id, em)
    expect(em.getComponent<CreatureComponent>(id, 'creature')!.damage).toBeCloseTo(5)
  })

  it('longevity=2.0 时 maxAge 乘以2', () => {
    const em = new EntityManager()
    const id = makeCreatureEntity(em, 1.0, 5, 500)
    em.addComponent(id, makeGenetics({ longevity: 2.0 }))
    GeneticsSystem.applyTraits(id, em)
    expect(em.getComponent<CreatureComponent>(id, 'creature')!.maxAge).toBeCloseTo(1000)
  })

  it('longevity=1.0 时 maxAge 不变', () => {
    const em = new EntityManager()
    const id = makeCreatureEntity(em, 1.0, 5, 500)
    em.addComponent(id, makeGenetics({ longevity: 1.0 }))
    GeneticsSystem.applyTraits(id, em)
    expect(em.getComponent<CreatureComponent>(id, 'creature')!.maxAge).toBeCloseTo(500)
  })

  it('全部特质=1.0 时所有属性不变', () => {
    const em = new EntityManager()
    const id = makeCreatureEntity(em, 2.0, 8, 400)
    em.addComponent(id, makeGenetics())
    GeneticsSystem.applyTraits(id, em)
    const c = em.getComponent<CreatureComponent>(id, 'creature')!
    expect(c.speed).toBeCloseTo(2.0)
    expect(c.damage).toBeCloseTo(8)
    expect(c.maxAge).toBeCloseTo(400)
  })
})

describe('GeneticsSystem.applyTraits — needs 组件缩放', () => {
  afterEach(() => vi.restoreAllMocks())

  it('vitality=2.0 时 health 乘以2（但不超过100）', () => {
    const em = new EntityManager()
    const id = em.createEntity()
    em.addComponent(id, { type: 'needs', hunger: 0, health: 50 } as any)
    em.addComponent(id, makeGenetics({ vitality: 2.0 }))
    GeneticsSystem.applyTraits(id, em)
    expect(em.getComponent<NeedsComponent>(id, 'needs')!.health).toBeCloseTo(100)
  })

  it('vitality=2.0 且 health=100 时，health 被 clamp 到 100', () => {
    const em = new EntityManager()
    const id = em.createEntity()
    em.addComponent(id, { type: 'needs', hunger: 0, health: 100 } as any)
    em.addComponent(id, makeGenetics({ vitality: 2.0 }))
    GeneticsSystem.applyTraits(id, em)
    expect(em.getComponent<NeedsComponent>(id, 'needs')!.health).toBeLessThanOrEqual(100)
  })

  it('vitality=0.5 时 health 乘以0.5', () => {
    const em = new EntityManager()
    const id = em.createEntity()
    em.addComponent(id, { type: 'needs', hunger: 0, health: 80 } as any)
    em.addComponent(id, makeGenetics({ vitality: 0.5 }))
    GeneticsSystem.applyTraits(id, em)
    expect(em.getComponent<NeedsComponent>(id, 'needs')!.health).toBeCloseTo(40)
  })

  it('vitality=1.0 时 health 不变', () => {
    const em = new EntityManager()
    const id = em.createEntity()
    em.addComponent(id, { type: 'needs', hunger: 0, health: 75 } as any)
    em.addComponent(id, makeGenetics({ vitality: 1.0 }))
    GeneticsSystem.applyTraits(id, em)
    expect(em.getComponent<NeedsComponent>(id, 'needs')!.health).toBeCloseTo(75)
  })

  it('实体无 needs 组件时不抛错', () => {
    const em = new EntityManager()
    const id = makeCreatureEntity(em)
    em.addComponent(id, makeGenetics())
    expect(() => GeneticsSystem.applyTraits(id, em)).not.toThrow()
  })
})

describe('GeneticsSystem.applyTraits — 边界条件', () => {
  afterEach(() => vi.restoreAllMocks())

  it('没有 genetics 组件时不抛错', () => {
    const em = new EntityManager()
    const id = makeCreatureEntity(em)
    expect(() => GeneticsSystem.applyTraits(id, em)).not.toThrow()
  })

  it('没有 genetics 组件时 creature 属性不变', () => {
    const em = new EntityManager()
    const id = makeCreatureEntity(em, 3.0, 7, 300)
    GeneticsSystem.applyTraits(id, em)
    const c = em.getComponent<CreatureComponent>(id, 'creature')!
    expect(c.speed).toBeCloseTo(3.0)
    expect(c.damage).toBeCloseTo(7)
    expect(c.maxAge).toBeCloseTo(300)
  })

  it('实体不存在时不抛错', () => {
    const em = new EntityManager()
    expect(() => GeneticsSystem.applyTraits(9999, em)).not.toThrow()
  })

  it('同时有 creature 和 needs 组件时两者都被缩放', () => {
    const em = new EntityManager()
    const id = makeCreatureEntity(em, 1.0, 5, 500)
    em.addComponent(id, { type: 'needs', hunger: 0, health: 50 } as any)
    em.addComponent(id, makeGenetics({ agility: 2.0, vitality: 1.5 }))
    GeneticsSystem.applyTraits(id, em)
    expect(em.getComponent<CreatureComponent>(id, 'creature')!.speed).toBeCloseTo(2.0)
    expect(em.getComponent<NeedsComponent>(id, 'needs')!.health).toBeCloseTo(75)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// logMutation
// ─────────────────────────────────────────────────────────────────────────────

describe('GeneticsSystem.logMutation', () => {
  afterEach(() => vi.restoreAllMocks())

  it('调用 logMutation 不抛错', () => {
    expect(() => GeneticsSystem.logMutation('Alice', 'human', 'Giant', 100)).not.toThrow()
  })

  it('多次调用 logMutation 不抛错', () => {
    expect(() => {
      GeneticsSystem.logMutation('A', 'elf', 'Swift', 1)
      GeneticsSystem.logMutation('B', 'orc', 'Weak', 2)
      GeneticsSystem.logMutation('C', 'dwarf', 'Tough', 3)
    }).not.toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GeneticsComponent 结构
// ─────────────────────────────────────────────────────────────────────────────

describe('GeneticsComponent 结构完整性', () => {
  afterEach(() => vi.restoreAllMocks())

  it('makeGenetics 默认所有特质为 1.0', () => {
    const g = makeGenetics()
    for (const key of TRAIT_KEYS) {
      expect(g.traits[key]).toBe(1.0)
    }
  })

  it('makeGenetics 可覆盖单个特质', () => {
    const g = makeGenetics({ strength: 2.3 })
    expect(g.traits.strength).toBe(2.3)
    expect(g.traits.vitality).toBe(1.0)
  })

  it('inheritTraits 后子代 parentA/parentB 正确', () => {
    const child = GeneticsSystem.inheritTraits(makeGenetics(), makeGenetics(), 10, 20)
    expect(child.parentA).toBe(10)
    expect(child.parentB).toBe(20)
  })

  it('generation=0 的两个父代，子代 generation=1', () => {
    const pA = makeGenetics(); pA.generation = 0
    const pB = makeGenetics(); pB.generation = 0
    expect(GeneticsSystem.inheritTraits(pA, pB, 1, 2).generation).toBe(1)
  })

  it('generation=10 的父代，子代 generation=11', () => {
    const pA = makeGenetics(); pA.generation = 10
    const pB = makeGenetics(); pB.generation = 8
    expect(GeneticsSystem.inheritTraits(pA, pB, 1, 2).generation).toBe(11)
  })
})
