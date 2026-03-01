// Diplomatic Exoneration System (v3.385) - Exoneration proceedings
// Formal clearing of blame or accusation between civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ExonerationForm = 'false_accusation_clearing' | 'war_crime_acquittal' | 'honor_vindication' | 'reputation_restoration'

export interface ExonerationProceeding {
  id: number
  civIdA: number
  civIdB: number
  form: ExonerationForm
  evidence: number
  justiceServed: number
  reputationRecovery: number
  diplomaticReset: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2440
const PROCEED_CHANCE = 0.0024
const MAX_PROCEEDINGS = 20

const FORMS: ExonerationForm[] = ['false_accusation_clearing', 'war_crime_acquittal', 'honor_vindication', 'reputation_restoration']

export class DiplomaticExonerationSystem {
  private proceedings: ExonerationProceeding[] = []
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
        evidence: 30 + Math.random() * 40,
        justiceServed: 20 + Math.random() * 35,
        reputationRecovery: 15 + Math.random() * 30,
        diplomaticReset: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const p of this.proceedings) {
      p.duration += 1
      p.evidence = Math.max(15, Math.min(90, p.evidence + (Math.random() - 0.47) * 0.12))
      p.justiceServed = Math.max(10, Math.min(85, p.justiceServed + (Math.random() - 0.5) * 0.11))
      p.reputationRecovery = Math.max(5, Math.min(75, p.reputationRecovery + (Math.random() - 0.45) * 0.10))
      p.diplomaticReset = Math.max(5, Math.min(65, p.diplomaticReset + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 85000
    for (let i = this.proceedings.length - 1; i >= 0; i--) {
      if (this.proceedings[i].tick < cutoff) this.proceedings.splice(i, 1)
    }
  }

}
