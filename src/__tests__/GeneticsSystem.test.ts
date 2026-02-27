import { describe, it, expect } from 'vitest'
import { GeneticsSystem, GeneticTraits } from '../systems/GeneticsSystem'
import { GeneticsComponent, EntityManager, CreatureComponent } from '../ecs/Entity'

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

const TRAIT_MIN = 0.3
const TRAIT_MAX = 2.5

describe('GeneticsSystem.generateRandomTraits', () => {
  it('返回有效的 GeneticsComponent', () => {
    const genetics = GeneticsSystem.generateRandomTraits()
    expect(genetics.type).toBe('genetics')
    expect(genetics.generation).toBe(0)
    expect(genetics.parentA).toBeNull()
    expect(genetics.parentB).toBeNull()
    expect(Array.isArray(genetics.mutations)).toBe(true)
    expect(genetics.mutations).toHaveLength(0)
  })

  it('所有特质在 [TRAIT_MIN, TRAIT_MAX] 范围内', () => {
    for (let i = 0; i < 20; i++) {
      const genetics = GeneticsSystem.generateRandomTraits()
      const traits = genetics.traits
      const keys: (keyof GeneticTraits)[] = ['strength', 'vitality', 'agility', 'fertility', 'longevity', 'intelligence']
      for (const key of keys) {
        expect(traits[key]).toBeGreaterThanOrEqual(TRAIT_MIN)
        expect(traits[key]).toBeLessThanOrEqual(TRAIT_MAX)
      }
    }
  })

  it('包含全部 6 个特质', () => {
    const genetics = GeneticsSystem.generateRandomTraits()
    expect(typeof genetics.traits.strength).toBe('number')
    expect(typeof genetics.traits.vitality).toBe('number')
    expect(typeof genetics.traits.agility).toBe('number')
    expect(typeof genetics.traits.fertility).toBe('number')
    expect(typeof genetics.traits.longevity).toBe('number')
    expect(typeof genetics.traits.intelligence).toBe('number')
  })
})

describe('GeneticsSystem.inheritTraits', () => {
  it('返回有效的 GeneticsComponent', () => {
    const parentA = makeGenetics({ strength: 1.5 })
    const parentB = makeGenetics({ strength: 0.8 })
    const child = GeneticsSystem.inheritTraits(parentA, parentB, 1, 2)
    expect(child.type).toBe('genetics')
    expect(child.parentA).toBe(1)
    expect(child.parentB).toBe(2)
  })

  it('子代 generation 是父代最大值 + 1', () => {
    const parentA = makeGenetics()
    parentA.generation = 3
    const parentB = makeGenetics()
    parentB.generation = 5
    const child = GeneticsSystem.inheritTraits(parentA, parentB, 1, 2)
    expect(child.generation).toBe(6)
  })

  it('子代特质在有效范围内', () => {
    const parentA = makeGenetics({ strength: 2.0, vitality: 1.5 })
    const parentB = makeGenetics({ strength: 0.5, vitality: 0.8 })
    for (let i = 0; i < 20; i++) {
      const child = GeneticsSystem.inheritTraits(parentA, parentB, 1, 2)
      const keys: (keyof GeneticTraits)[] = ['strength', 'vitality', 'agility', 'fertility', 'longevity', 'intelligence']
      for (const key of keys) {
        expect(child.traits[key]).toBeGreaterThanOrEqual(TRAIT_MIN)
        expect(child.traits[key]).toBeLessThanOrEqual(TRAIT_MAX)
      }
    }
  })

  it('子代继承突变列表为空', () => {
    const parentA = makeGenetics()
    parentA.mutations = ['Giant', 'Swift']
    const parentB = makeGenetics()
    const child = GeneticsSystem.inheritTraits(parentA, parentB, 1, 2)
    // 继承时突变列表应该重置（子代从零开始积累）
    expect(child.mutations).toHaveLength(0)
  })
})

describe('GeneticsSystem.mutate', () => {
  it('mutate 可以返回 null（大部分时候）', () => {
    // MUTATION_CHANCE=5%，运行 1000 次应该有大量 null
    let nullCount = 0
    const genetics = makeGenetics()
    for (let i = 0; i < 1000; i++) {
      const result = GeneticsSystem.mutate(makeGenetics())
      if (result === null) nullCount++
    }
    // 至少 80% 的时候返回 null（预期95%，统计宽松）
    expect(nullCount).toBeGreaterThan(800)
  })

  it('发生突变时返回突变名字（字符串）', () => {
    // 运行足够多次以确保至少触发一次突变
    let mutationName: string | null = null
    for (let i = 0; i < 10000 && mutationName === null; i++) {
      mutationName = GeneticsSystem.mutate(makeGenetics())
    }
    expect(typeof mutationName).toBe('string')
    expect((mutationName as string).length).toBeGreaterThan(0)
  })

  it('突变会修改特质值', () => {
    // 强制找到一次突变，验证特质确实改变了
    for (let attempt = 0; attempt < 10000; attempt++) {
      const genetics = makeGenetics({ strength: 1.0 })
      const originalStrength = genetics.traits.strength
      const result = GeneticsSystem.mutate(genetics)
      if (result !== null) {
        // 有突变发生，至少有一个特质应该改变
        const traits = genetics.traits
        const keys: (keyof GeneticTraits)[] = ['strength', 'vitality', 'agility', 'fertility', 'longevity', 'intelligence']
        const changed = keys.some(k => genetics.traits[k] !== (k === 'strength' ? originalStrength : 1.0))
        expect(changed || traits.strength !== originalStrength).toBe(true)
        // 突变后特质仍在有效范围内
        for (const key of keys) {
          expect(traits[key]).toBeGreaterThanOrEqual(TRAIT_MIN)
          expect(traits[key]).toBeLessThanOrEqual(TRAIT_MAX)
        }
        // 突变名被添加到 mutations 列表
        expect(genetics.mutations).toContain(result)
        return // 测试通过
      }
    }
  })
})

describe('GeneticsSystem.applyTraits', () => {
  it('应用特质后 creature.speed 按 agility 缩放', () => {
    const em = new EntityManager()
    const id = em.createEntity()
    em.addComponent(id, {
      type: 'creature',
      species: 'human',
      speed: 1.0,
      damage: 5,
      isHostile: false,
      name: 'Test',
      age: 0,
      maxAge: 500,
      gender: 'male'
    })
    em.addComponent(id, {
      type: 'genetics',
      traits: { strength: 1.0, vitality: 1.0, agility: 2.0, fertility: 1.0, longevity: 1.0, intelligence: 1.0 },
      mutations: [],
      generation: 0,
      parentA: null,
      parentB: null,
    })
    GeneticsSystem.applyTraits(id, em)
    const creature = em.getComponent<CreatureComponent>(id, 'creature')
    // speed(1.0) * agility(2.0) = 2.0
    expect(creature!.speed).toBeCloseTo(2.0)
  })

  it('没有 genetics 组件时不抛错', () => {
    const em = new EntityManager()
    const id = em.createEntity()
    expect(() => GeneticsSystem.applyTraits(id, em)).not.toThrow()
  })
})
