// Creature Cheese Ager System (v3.143) - Cheese making and aging
// Creatures craft and age cheeses, improving food quality over time

import { EntityManager } from '../ecs/Entity'

export type CheeseVariety = 'cheddar' | 'brie' | 'gouda' | 'blue'

export interface CheeseAgerData {
  entityId: number
  cheesesAging: number
  bestAge: number
  variety: CheeseVariety
  skill: number
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 3200
const ASSIGN_CHANCE = 0.002
const MAX_AGERS = 8

const VARIETIES: CheeseVariety[] = ['cheddar', 'brie', 'gouda', 'blue']
const VARIETY_AGING_RATE: Record<CheeseVariety, number> = {
  cheddar: 1.0, brie: 1.5, gouda: 0.8, blue: 1.2,
}

export class CreatureCheeseAgerSystem {
  private agers: CheeseAgerData[] = []
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Assign new cheese agers
    if (this.agers.length < MAX_AGERS && Math.random() < ASSIGN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const already = this.agers.some(a => a.entityId === eid)
        if (!already) {
          const variety = VARIETIES[Math.floor(Math.random() * VARIETIES.length)]
          this.agers.push({
            entityId: eid,
            cheesesAging: 1,
            bestAge: 0,
            variety,
            skill: 10 + Math.floor(Math.random() * 20),
            active: true,
            tick,
          })
        }
      }
    }

    // Age cheeses and improve skill
    for (const a of this.agers) {
      if (!a.active) continue
      const agingRate = VARIETY_AGING_RATE[a.variety]
      const elapsed = tick - a.tick
      const currentAge = elapsed * agingRate * 0.001

      if (currentAge > a.bestAge) {
        a.bestAge = currentAge
        a.skill = Math.min(100, a.skill + 0.1)
      }

      // Skilled agers start new batches
      if (Math.random() < 0.008 * (a.skill / 100)) {
        a.cheesesAging = Math.min(10, a.cheesesAging + 1)
      }
    }

    // Remove agers whose creatures no longer exist
    for (let i = this.agers.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.agers[i].entityId, 'creature')) this.agers.splice(i, 1)
    }
  }

  getAgers(): readonly CheeseAgerData[] { return this.agers }
}
