// Diplomatic Mediation System (v3.240) - Third-party conflict mediation
// Neutral civilizations facilitate negotiations between disputing parties

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ConflictType = 'territorial' | 'economic' | 'cultural' | 'military'

export interface Mediation {
  id: number
  party1CivId: number
  party2CivId: number
  mediatorCivId: number
  conflictType: ConflictType
  progress: number
  trust: number
  outcome: 'resolved' | 'stalled' | 'failed'
  sessions: number
  tick: number
}

const CHECK_INTERVAL = 2400
const MEDIATE_CHANCE = 0.003
const MAX_MEDIATIONS = 24

const CONFLICT_TYPES: ConflictType[] = ['territorial', 'economic', 'cultural', 'military']

export class DiplomaticMediationSystem {
  private mediations: Mediation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.mediations.length < MAX_MEDIATIONS && Math.random() < MEDIATE_CHANCE) {
      const party1 = 1 + Math.floor(Math.random() * 8)
      const party2 = 1 + Math.floor(Math.random() * 8)
      if (party1 === party2) return

      let mediator = 1 + Math.floor(Math.random() * 8)
      while (mediator === party1 || mediator === party2) {
        mediator = 1 + Math.floor(Math.random() * 8)
      }

      const conflictType = CONFLICT_TYPES[Math.floor(Math.random() * CONFLICT_TYPES.length)]

      this.mediations.push({
        id: this.nextId++,
        party1CivId: party1,
        party2CivId: party2,
        mediatorCivId: mediator,
        conflictType,
        progress: 5 + Math.random() * 15,
        trust: 10 + Math.random() * 30,
        outcome: 'stalled',
        sessions: 1,
        tick,
      })
    }

    for (const med of this.mediations) {
      med.progress = Math.min(100, med.progress + 0.08 + med.trust * 0.002)
      med.trust = Math.min(100, med.trust + 0.03)
      med.sessions += Math.random() < 0.01 ? 1 : 0

      if (med.progress >= 90 && med.outcome === 'stalled') {
        med.outcome = Math.random() < 0.7 ? 'resolved' : 'failed'
      }
    }

    const cutoff = tick - 75000
    for (let i = this.mediations.length - 1; i >= 0; i--) {
      if (this.mediations[i].tick < cutoff) this.mediations.splice(i, 1)
    }
  }

  getMediations(): Mediation[] { return this.mediations }
}
