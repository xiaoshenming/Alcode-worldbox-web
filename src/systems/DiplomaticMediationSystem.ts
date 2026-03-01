// Diplomatic Mediation System (v3.448) - Mediation diplomacy
// Third-party civilizations mediating disputes between conflicting parties

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MediationOutcome = 'pending' | 'agreement' | 'breakdown' | 'partial'

export interface MediationProcess {
  id: number
  mediatorCivId: number
  disputantA: number
  disputantB: number
  outcome: MediationOutcome
  trustLevel: number
  progressRate: number
  fairnessScore: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2540
const INITIATE_CHANCE = 0.0021
const MAX_MEDIATIONS = 18

export class DiplomaticMediationSystem {
  private mediations: MediationProcess[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.mediations.length < MAX_MEDIATIONS && Math.random() < INITIATE_CHANCE) {
      const a = 1 + Math.floor(Math.random() * 8)
      const b = 1 + Math.floor(Math.random() * 8)
      const mediator = 1 + Math.floor(Math.random() * 8)
      if (a === b || a === mediator || b === mediator) return

      this.mediations.push({
        id: this.nextId++,
        mediatorCivId: mediator,
        disputantA: a,
        disputantB: b,
        outcome: 'pending',
        trustLevel: 20 + Math.random() * 30,
        progressRate: 0.5 + Math.random() * 0.5,
        fairnessScore: 30 + Math.random() * 40,
        duration: 0,
        tick,
      })
    }

    for (const m of this.mediations) {
      m.duration++
      m.trustLevel = Math.min(100, m.trustLevel + 0.02 * m.progressRate)
      if (m.trustLevel > 75 && Math.random() < 0.03) m.outcome = 'agreement'
      if (m.trustLevel < 15 && Math.random() < 0.05) m.outcome = 'breakdown'
    }

    for (let _i = this.mediations.length - 1; _i >= 0; _i--) { if (!((m) => m.outcome === 'pending' || m.duration < 50)(this.mediations[_i])) this.mediations.splice(_i, 1) }
  }

}
