// Genetic Traits & Inheritance System (v0.96)

import { EntityManager, EntityId, CreatureComponent, NeedsComponent, GeneticsComponent } from '../ecs/Entity'
import { EventLog } from './EventLog'

export interface GeneticTraits {
  strength: number     // 0.5-2.0, affects damage
  vitality: number     // 0.5-2.0, affects max health
  agility: number      // 0.5-2.0, affects speed
  fertility: number    // 0.5-2.0, affects breed chance
  longevity: number    // 0.5-2.0, affects max age
  intelligence: number // 0.5-2.0, affects tech contribution
}

interface MutationDef {
  name: string
  trait: keyof GeneticTraits
  delta: number // positive = buff, negative = debuff
}

const MUTATIONS: MutationDef[] = [
  { name: 'Giant', trait: 'strength', delta: 0.4 },
  { name: 'Swift', trait: 'agility', delta: 0.4 },
  { name: 'Tough', trait: 'vitality', delta: 0.4 },
  { name: 'Genius', trait: 'intelligence', delta: 0.4 },
  { name: 'Eternal', trait: 'longevity', delta: 0.4 },
  { name: 'Fertile', trait: 'fertility', delta: 0.4 },
  { name: 'Weak', trait: 'strength', delta: -0.4 },
  { name: 'Frail', trait: 'vitality', delta: -0.4 },
  { name: 'Slow', trait: 'agility', delta: -0.4 },
]

const TRAIT_MIN = 0.3
const TRAIT_MAX = 2.5
const MUTATION_CHANCE = 0.05
const GENETIC_TRAIT_KEYS: readonly (keyof GeneticTraits)[] = ['strength', 'vitality', 'agility', 'fertility', 'longevity', 'intelligence']

function clampTrait(v: number): number {
  return Math.max(TRAIT_MIN, Math.min(TRAIT_MAX, v))
}

/** Box-Muller normal distribution, mean=1.0, stddev=0.2 */
function randomNormal(mean: number = 1.0, stddev: number = 0.2): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2 * Math.log(u1 || 0.0001)) * Math.cos(2 * Math.PI * u2)
  return mean + z * stddev
}

export class GeneticsSystem {
  /** Generate random traits for a newly spawned creature (no parents). */
  static generateRandomTraits(): GeneticsComponent {
    return {
      type: 'genetics',
      traits: {
        strength: clampTrait(randomNormal()),
        vitality: clampTrait(randomNormal()),
        agility: clampTrait(randomNormal()),
        fertility: clampTrait(randomNormal()),
        longevity: clampTrait(randomNormal()),
        intelligence: clampTrait(randomNormal()),
      },
      mutations: [],
      generation: 0,
      parentA: null,
      parentB: null,
    }
  }

  /** Inherit traits from two parents. Each trait randomly picks one parent's value + small variation. */
  static inheritTraits(parentA: GeneticsComponent, parentB: GeneticsComponent, parentAId: EntityId, parentBId: EntityId): GeneticsComponent {
    const traitKeys = GENETIC_TRAIT_KEYS

    const childTraits: GeneticTraits = {
      strength: 1, vitality: 1, agility: 1, fertility: 1, longevity: 1, intelligence: 1,
    }

    for (const key of traitKeys) {
      // Randomly pick from parent A or B
      const base = Math.random() < 0.5 ? parentA.traits[key] : parentB.traits[key]
      // Small random variation ±0.1
      const variation = (Math.random() - 0.5) * 0.2
      childTraits[key] = clampTrait(base + variation)
    }

    const generation = Math.max(parentA.generation, parentB.generation) + 1

    return {
      type: 'genetics',
      traits: childTraits,
      mutations: [],
      generation,
      parentA: parentAId,
      parentB: parentBId,
    }
  }

  /** Attempt mutation on a genetics component. 5% chance per call. Modifies in place and returns mutation name if it occurred. */
  static mutate(genetics: GeneticsComponent): string | null {
    if (Math.random() >= MUTATION_CHANCE) return null

    const mutation = MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)]
    // Apply delta with some randomness (±0.3 to ±0.5 range)
    const sign = mutation.delta > 0 ? 1 : -1
    const magnitude = 0.3 + Math.random() * 0.2
    genetics.traits[mutation.trait] = clampTrait(genetics.traits[mutation.trait] + sign * magnitude)
    genetics.mutations.push(mutation.name)

    return mutation.name
  }

  /** Apply genetic traits to a creature's actual stats. */
  static applyTraits(entityId: EntityId, em: EntityManager): void {
    const genetics = em.getComponent<GeneticsComponent>(entityId, 'genetics')
    if (!genetics) return

    const creature = em.getComponent<CreatureComponent>(entityId, 'creature')
    if (creature) {
      creature.speed *= genetics.traits.agility
      creature.damage *= genetics.traits.strength
      creature.maxAge *= genetics.traits.longevity
    }

    const needs = em.getComponent<NeedsComponent>(entityId, 'needs')
    if (needs) {
      // Vitality affects max health (scale from base 100)
      needs.health = Math.min(100, needs.health * genetics.traits.vitality)
    }
  }

  /** Log a mutation event. */
  static logMutation(creatureName: string, species: string, mutationName: string, tick: number): void {
    EventLog.log('mutation', `${creatureName} (${species}) gained mutation: ${mutationName}`, tick)
  }
}
