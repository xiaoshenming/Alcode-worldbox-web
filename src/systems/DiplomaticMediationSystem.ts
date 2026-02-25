// Diplomatic Mediation System (v3.53) - Third-party civilizations mediate conflicts
// Successful mediation prevents wars and improves relations between conflicting civs

import { EntityManager } from '../ecs/Entity'

export type MediationOutcome = 'pending' | 'success' | 'partial' | 'failure'

export interface Mediation {
  id: number
  mediatorCivId: number
  civAId: number
  civBId: number
  outcome: MediationOutcome
  progress: number     // 0-100
  trustGain: number    // bonus trust on success
  startTick: number
  duration: number
}

const CHECK_INTERVAL = 1500
const MEDIATION_CHANCE = 0.004
const MAX_MEDIATIONS = 15
const PROGRESS_RATE = 0.06
const SUCCESS_THRESHOLD = 80

export class DiplomaticMediationSystem {
  private mediations: Mediation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, civManager: any, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (!civManager?.civilizations) return
    const civs = civManager.civilizations
    if (civs.length < 3) return

    // Start new mediations
    if (this.mediations.length < MAX_MEDIATIONS && Math.random() < MEDIATION_CHANCE) {
      const indices = Array.from({ length: civs.length }, (_, i) => i)
      // Pick 3 different civs
      const iA = Math.floor(Math.random() * indices.length)
      const a = indices.splice(iA, 1)[0]
      const iB = Math.floor(Math.random() * indices.length)
      const b = indices.splice(iB, 1)[0]
      const iM = Math.floor(Math.random() * indices.length)
      const m = indices[iM]

      this.mediations.push({
        id: this.nextId++,
        mediatorCivId: civs[m].id,
        civAId: civs[a].id,
        civBId: civs[b].id,
        outcome: 'pending',
        progress: 0,
        trustGain: 10 + Math.random() * 20,
        startTick: tick,
        duration: 2500 + Math.random() * 4000,
      })
    }

    // Update mediations
    for (const med of this.mediations) {
      if (med.outcome !== 'pending') continue

      med.progress += PROGRESS_RATE * CHECK_INTERVAL

      // Random setbacks
      if (Math.random() < 0.02) {
        med.progress = Math.max(0, med.progress - 10)
      }

      // Determine outcome
      const elapsed = tick - med.startTick
      if (elapsed > med.duration) {
        if (med.progress >= SUCCESS_THRESHOLD) {
          med.outcome = 'success'
        } else if (med.progress >= 50) {
          med.outcome = 'partial'
          med.trustGain *= 0.4
        } else {
          med.outcome = 'failure'
          med.trustGain = 0
        }
      }
    }

    // Clean up old mediations
    const cutoff = tick - 5000
    this.mediations = this.mediations.filter(
      m => m.outcome === 'pending' || m.startTick > cutoff
    )
  }

  getMediations(): Mediation[] {
    return this.mediations
  }

  getByMediator(civId: number): Mediation[] {
    return this.mediations.filter(m => m.mediatorCivId === civId)
  }
}
