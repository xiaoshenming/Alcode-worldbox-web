// Creature Herbalist System (v3.163) - Herb gathering and potion brewing
// Herbalists collect plants, brew potions, and accumulate botanical knowledge

import { EntityManager } from '../ecs/Entity'

export type HerbSpecialty = 'healing' | 'poison' | 'buff' | 'antidote'

export interface Herbalist {
  id: number
  entityId: number
  skill: number
  herbsGathered: number
  potionsBrewed: number
  knowledge: number
  specialty: HerbSpecialty
  tick: number
}

const CHECK_INTERVAL = 3000
const SPAWN_CHANCE = 0.003
const MAX_HERBALISTS = 12

const SPECIALTIES: HerbSpecialty[] = ['healing', 'poison', 'buff', 'antidote']
const POTION_DIFFICULTY: Record<HerbSpecialty, number> = {
  healing: 0.20, poison: 0.35, buff: 0.30, antidote: 0.40,
}

export class CreatureHerbalistSystem {
  private herbalists: Herbalist[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Recruit new herbalists from existing creatures
    if (this.herbalists.length < MAX_HERBALISTS && Math.random() < SPAWN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const already = this.herbalists.some(h => h.entityId === eid)
        if (!already) {
          const spec = SPECIALTIES[Math.floor(Math.random() * SPECIALTIES.length)]
          this.herbalists.push({
            id: this.nextId++,
            entityId: eid,
            skill: 5 + Math.random() * 10,
            herbsGathered: 0,
            potionsBrewed: 0,
            knowledge: 1,
            specialty: spec,
            tick,
          })
        }
      }
    }

    // Herbalists gather herbs and brew potions
    for (const h of this.herbalists) {
      // Gather herbs based on skill and knowledge
      if (Math.random() < 0.03 * (h.skill / 50)) {
        h.herbsGathered += 1 + Math.floor(h.knowledge * 0.3)
        h.knowledge = Math.min(50, h.knowledge + 0.1)
      }

      // Brew potions when enough herbs collected
      if (h.herbsGathered >= 4 && Math.random() < 0.015) {
        const difficulty = POTION_DIFFICULTY[h.specialty]
        const successChance = (h.skill / 100) * (1 - difficulty) + h.knowledge * 0.01
        if (Math.random() < successChance) {
          h.potionsBrewed++
          h.skill = Math.min(100, h.skill + 0.4)
          h.herbsGathered -= 4
        } else {
          // Failed brew wastes some herbs
          h.herbsGathered -= 2
          h.knowledge = Math.min(50, h.knowledge + 0.2)
        }
      }

      // Occasionally switch specialty as knowledge grows
      if (h.knowledge > 10 && Math.random() < 0.004) {
        h.specialty = SPECIALTIES[Math.floor(Math.random() * SPECIALTIES.length)]
      }
    }

    // Remove herbalists whose creatures no longer exist
    const alive = new Set(em.getEntitiesWithComponent('creature'))
    for (let i = this.herbalists.length - 1; i >= 0; i--) {
      if (!alive.has(this.herbalists[i].entityId)) this.herbalists.splice(i, 1)
    }
  }

  getHerbalists(): readonly Herbalist[] { return this.herbalists }
}
