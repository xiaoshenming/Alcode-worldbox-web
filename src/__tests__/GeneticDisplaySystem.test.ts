import { describe, it, expect, beforeEach } from 'vitest'
import { GeneticsSystem } from '../systems/GeneticsSystem'
import { EntityManager } from '../ecs/Entity'

describe('GeneticDisplaySystem删除后 - GeneticsSystem基础功能', () => {
  let em: EntityManager
  beforeEach(() => { em = new EntityManager() })
  it('generateRandomTraits返回有效组件', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(g.type).toBe('genetics')
    expect(g.generation).toBe(0)
    expect(g.parentA).toBeNull()
    expect(g.parentB).toBeNull()
  })
  it('generateRandomTraits traits字段包含strength等', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(typeof g.traits.strength).toBe('number')
    expect(typeof g.traits.vitality).toBe('number')
    expect(typeof g.traits.agility).toBe('number')
  })
  it('generateRandomTraits traits值在合理范围内', () => {
    const g = GeneticsSystem.generateRandomTraits()
    expect(g.traits.strength).toBeGreaterThanOrEqual(0.3)
    expect(g.traits.strength).toBeLessThanOrEqual(2.5)
  })
  it('mutate不总是发生（5%概率）', () => {
    const g = GeneticsSystem.generateRandomTraits()
    let mutated = false
    for (let i = 0; i < 100; i++) {
      if (GeneticsSystem.mutate(g) !== null) { mutated = true; break }
    }
    expect(mutated).toBe(true)
  })
})
