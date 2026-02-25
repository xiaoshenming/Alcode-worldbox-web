// Diplomatic Amnesty System (v3.210) - Nations grant amnesty to prisoners and exiles
// Amnesty pacts improve goodwill between nations and can ease tensions after conflicts

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AmnestyStatus = 'proposed' | 'active' | 'expired' | 'rejected'

export interface AmnestyPact {
  id: number
  nationA: number
  nationB: number
  status: AmnestyStatus
  strength: number
  prisonersReleased: number
  goodwillBonus: number
  compliance: number
  tick: number
}

const CHECK_INTERVAL = 3000
const FORM_CHANCE = 0.004
const MAX_PACTS = 30

export class DiplomaticAmnestySystem {
  private pacts: AmnestyPact[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const nations = this.getNations(em)
    for (let i = 0; i < nations.length; i++) {
      for (let j = i + 1; j < nations.length; j++) {
        if (this.pacts.length >= MAX_PACTS) break
        if (Math.random() > FORM_CHANCE) continue

        const prisonersReleased = 5 + Math.floor(Math.random() * 30)
        const goodwillBonus = 10 + Math.random() * 40
        const compliance = 30 + Math.random() * 40

        this.pacts.push({
          id: this.nextId++,
          nationA: nations[i],
          nationB: nations[j],
          status: 'proposed',
          strength: 20 + Math.random() * 50,
          prisonersReleased,
          goodwillBonus,
          compliance,
          tick,
        })
      }
    }

    // Proposed pacts may become active or rejected
    for (const p of this.pacts) {
      if (p.status === 'proposed') {
        if (p.compliance > 50 && Math.random() < 0.3) {
          p.status = 'active'
        } else if (p.compliance < 30 && Math.random() < 0.2) {
          p.status = 'rejected'
        }
      }
      if (p.status === 'active') {
        p.goodwillBonus = Math.min(100, p.goodwillBonus + 0.5)
        p.compliance = Math.max(0, Math.min(100, p.compliance + (Math.random() - 0.45) * 3))
        if (tick - p.tick > 30000) {
          p.status = 'expired'
        }
      }
    }

    const cutoff = tick - 48000
    for (let i = this.pacts.length - 1; i >= 0; i--) {
      if ((this.pacts[i].status === 'expired' || this.pacts[i].status === 'rejected') && this.pacts[i].tick < cutoff) {
        this.pacts.splice(i, 1)
      }
    }
  }

  private getNations(em: EntityManager): number[] {
    const set = new Set<number>()
    for (const eid of em.getEntitiesWithComponents('creature')) {
      set.add(eid % 6)
    }
    return Array.from(set)
  }

  getPacts(): readonly AmnestyPact[] { return this.pacts }
}
