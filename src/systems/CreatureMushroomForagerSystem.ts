// Creature Mushroom Forager System (v3.153) - Mushroom foraging for food and medicine
// Creatures learn to identify mushrooms, risking poisoning but gaining knowledge

import { EntityManager } from '../ecs/Entity'

export type MushroomType = 'edible' | 'medicinal' | 'poisonous' | 'rare'

export interface MushroomForager {
  id: number
  entityId: number
  knowledge: number
  mushroomsFound: number
  poisoned: boolean
  antidotes: number
  tick: number
}

const CHECK_INTERVAL = 3400
const ASSIGN_CHANCE = 0.004
const MAX_FORAGERS = 10

const MUSHROOM_TYPES: MushroomType[] = ['edible', 'medicinal', 'poisonous', 'rare']
const POISON_BASE_CHANCE = 0.15
const KNOWLEDGE_PER_FIND = 0.8

export class CreatureMushroomForagerSystem {
  private foragers: MushroomForager[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Assign new foragers
    if (this.foragers.length < MAX_FORAGERS && Math.random() < ASSIGN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const already = this.foragers.some(f => f.entityId === eid)
        if (!already) {
          this.foragers.push({
            id: this.nextId++,
            entityId: eid,
            knowledge: 5 + Math.random() * 10,
            mushroomsFound: 0,
            poisoned: false,
            antidotes: 0,
            tick,
          })
        }
      }
    }

    // Foragers search for mushrooms
    for (const f of this.foragers) {
      if (Math.random() > 0.02) continue

      const type = MUSHROOM_TYPES[Math.floor(Math.random() * MUSHROOM_TYPES.length)]
      f.mushroomsFound++
      f.knowledge = Math.min(100, f.knowledge + KNOWLEDGE_PER_FIND)

      if (type === 'poisonous') {
        // Higher knowledge reduces poison chance
        const poisonChance = POISON_BASE_CHANCE * (1 - f.knowledge / 120)
        if (Math.random() < poisonChance) {
          if (f.antidotes > 0) {
            f.antidotes--
          } else {
            f.poisoned = true
          }
        }
      } else if (type === 'medicinal') {
        f.antidotes = Math.min(5, f.antidotes + 1)
        if (f.poisoned && Math.random() < 0.6) {
          f.poisoned = false
        }
      } else if (type === 'rare') {
        f.knowledge = Math.min(100, f.knowledge + KNOWLEDGE_PER_FIND * 3)
      }

      // Poisoned foragers may recover naturally over time
      if (f.poisoned && Math.random() < 0.03) {
        f.poisoned = false
      }
    }

    // Remove foragers whose creatures no longer exist
    const alive = new Set(em.getEntitiesWithComponent('creature'))
    for (let i = this.foragers.length - 1; i >= 0; i--) {
      if (!alive.has(this.foragers[i].entityId)) this.foragers.splice(i, 1)
    }
  }

  getForagers(): readonly MushroomForager[] { return this.foragers }
}
