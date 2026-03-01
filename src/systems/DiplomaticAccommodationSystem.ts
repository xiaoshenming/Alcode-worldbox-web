// Diplomatic Accommodation System (v3.478) - Accommodation diplomacy
// Mutual adjustment of positions to reach workable agreements

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AccommodationForm = 'position_adjustment' | 'mutual_concession' | 'flexible_terms' | 'adaptive_agreement'

export interface AccommodationProceeding {
  id: number
  civIdA: number
  civIdB: number
  form: AccommodationForm
  flexibility: number
  mutualBenefit: number
  adjustmentDepth: number
  stabilityGain: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2480
const PROCEED_CHANCE = 0.0023
const MAX_PROCEEDINGS = 18

const FORMS: AccommodationForm[] = ['position_adjustment', 'mutual_concession', 'flexible_terms', 'adaptive_agreement']

export class DiplomaticAccommodationSystem {
  private proceedings: AccommodationProceeding[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.proceedings.length < MAX_PROCEEDINGS && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.proceedings.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        flexibility: 25 + Math.random() * 40,
        mutualBenefit: 20 + Math.random() * 35,
        adjustmentDepth: 15 + Math.random() * 30,
        stabilityGain: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const p of this.proceedings) {
      p.duration += 1
      p.flexibility = Math.max(10, Math.min(90, p.flexibility + (Math.random() - 0.47) * 0.12))
      p.mutualBenefit = Math.max(10, Math.min(85, p.mutualBenefit + (Math.random() - 0.5) * 0.11))
      p.adjustmentDepth = Math.max(5, Math.min(75, p.adjustmentDepth + (Math.random() - 0.45) * 0.10))
      p.stabilityGain = Math.max(5, Math.min(65, p.stabilityGain + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.proceedings.length - 1; i >= 0; i--) {
      if (this.proceedings[i].tick < cutoff) this.proceedings.splice(i, 1)
    }
  }

}
