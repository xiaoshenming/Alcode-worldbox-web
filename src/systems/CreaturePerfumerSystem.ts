// Creature Perfumer System (v3.176) - Creatures collect flowers and spices to craft perfumes
// Perfumers gather essences from nature and blend them into fragrances for trade

import { EntityManager } from '../ecs/Entity'

export type FragranceType = 'floral' | 'spicy' | 'woody' | 'citrus'

export interface Perfumer {
  id: number
  entityId: number
  skill: number
  essencesCollected: number
  perfumesCrafted: number
  fragranceType: FragranceType
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 3000
const SPAWN_CHANCE = 0.003
const MAX_PERFUMERS = 10

const FRAGRANCE_TYPES: FragranceType[] = ['floral', 'spicy', 'woody', 'citrus']
const FRAGRANCE_VALUE: Record<FragranceType, number> = {
  floral: 0.7, spicy: 0.9, woody: 0.5, citrus: 0.6,
}

export class CreaturePerfumerSystem {
  private perfumers: Perfumer[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Recruit new perfumers
    if (this.perfumers.length < MAX_PERFUMERS && Math.random() < SPAWN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        if (!this.perfumers.some(p => p.entityId === eid)) {
          const frag = FRAGRANCE_TYPES[Math.floor(Math.random() * FRAGRANCE_TYPES.length)]
          this.perfumers.push({
            id: this.nextId++, entityId: eid,
            skill: 5 + Math.random() * 15,
            essencesCollected: 0, perfumesCrafted: 0,
            fragranceType: frag,
            reputation: 0, tick,
          })
        }
      }
    }

    for (const p of this.perfumers) {
      // Collect essences from nature
      const gatherChance = (p.skill / 100) * 0.06
      if (Math.random() < gatherChance) {
        p.essencesCollected++
        p.skill = Math.min(100, p.skill + 0.1)
      }

      // Craft perfumes when enough essences gathered
      if (p.essencesCollected >= 3 && Math.random() < 0.03) {
        p.perfumesCrafted++
        p.essencesCollected -= 3
        const value = FRAGRANCE_VALUE[p.fragranceType]
        p.reputation = Math.min(100, p.reputation + value * 2)
      }

      // Discover new fragrance with high skill
      if (p.skill > 60 && Math.random() < 0.004) {
        const idx = FRAGRANCE_TYPES.indexOf(p.fragranceType)
        if (idx < FRAGRANCE_TYPES.length - 1) p.fragranceType = FRAGRANCE_TYPES[idx + 1]
      }

      // Reputation grows with craftsmanship
      if (p.perfumesCrafted > 5 && Math.random() < 0.005) {
        p.reputation = Math.min(100, p.reputation + 0.5)
      }
    }

    // Remove perfumers whose creatures no longer exist
    const alive = new Set(em.getEntitiesWithComponent('creature'))
    for (let i = this.perfumers.length - 1; i >= 0; i--) {
      if (!alive.has(this.perfumers[i].entityId)) this.perfumers.splice(i, 1)
    }
  }

  getPerfumers(): readonly Perfumer[] { return this.perfumers }
}
