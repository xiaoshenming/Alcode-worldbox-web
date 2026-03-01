// Creature Chronicler System (v3.132) - Chroniclers who record world events
// Some creatures become chroniclers, documenting wars, nature, culture, and trade

import { EntityManager } from '../ecs/Entity'

export type ChroniclerSpecialty = 'war' | 'nature' | 'culture' | 'trade'

export interface ChroniclerData {
  entityId: number
  recordCount: number
  specialty: ChroniclerSpecialty
  reputation: number
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 3000
const ASSIGN_CHANCE = 0.002
const MAX_CHRONICLERS = 10

const SPECIALTIES: ChroniclerSpecialty[] = ['war', 'nature', 'culture', 'trade']
const RECORD_RATE: Record<ChroniclerSpecialty, number> = {
  war: 0.03, nature: 0.04, culture: 0.025, trade: 0.035,
}

export class CreatureChroniclerSystem {
  private chroniclers: ChroniclerData[] = []
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.chroniclers.length < MAX_CHRONICLERS && Math.random() < ASSIGN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const already = this.chroniclers.some(c => c.entityId === eid)
        if (!already) {
          const spec = SPECIALTIES[Math.floor(Math.random() * SPECIALTIES.length)]
          this.chroniclers.push({
            entityId: eid,
            recordCount: 0,
            specialty: spec,
            reputation: Math.floor(Math.random() * 10),
            active: true,
            tick,
          })
        }
      }
    }

    for (const c of this.chroniclers) {
      // Record events over time
      if (Math.random() < RECORD_RATE[c.specialty]) {
        c.recordCount++
        c.reputation = Math.min(100, c.reputation + 0.2)
      }
      // Renowned chroniclers gain reputation faster
      if (c.recordCount > 50 && Math.random() < 0.01) {
        c.reputation = Math.min(100, c.reputation + 1)
      }
    }

    for (let i = this.chroniclers.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.chroniclers[i].entityId, 'creature')) this.chroniclers.splice(i, 1)
    }
  }

}
