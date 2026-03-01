// Diplomatic Catchpole System (v3.732) - Catchpole law enforcement
// Officers responsible for apprehending debtors and enforcing court orders between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type CatchpoleForm = 'royal_catchpole' | 'court_catchpole' | 'shire_catchpole' | 'borough_catchpole'

export interface CatchpoleArrangement {
  id: number
  enforcingCivId: number
  subjectCivId: number
  form: CatchpoleForm
  enforcementAuthority: number
  debtRecovery: number
  courtCompliance: number
  jurisdictionReach: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3090
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: CatchpoleForm[] = ['royal_catchpole', 'court_catchpole', 'shire_catchpole', 'borough_catchpole']

export class DiplomaticCatchpoleSystem {
  private arrangements: CatchpoleArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const enforcing = 1 + Math.floor(Math.random() * 8)
      const subject = 1 + Math.floor(Math.random() * 8)
      if (enforcing === subject) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        enforcingCivId: enforcing,
        subjectCivId: subject,
        form,
        enforcementAuthority: 20 + Math.random() * 40,
        debtRecovery: 25 + Math.random() * 35,
        courtCompliance: 10 + Math.random() * 30,
        jurisdictionReach: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.enforcementAuthority = Math.max(5, Math.min(85, a.enforcementAuthority + (Math.random() - 0.48) * 0.12))
      a.debtRecovery = Math.max(10, Math.min(90, a.debtRecovery + (Math.random() - 0.5) * 0.11))
      a.courtCompliance = Math.max(5, Math.min(80, a.courtCompliance + (Math.random() - 0.42) * 0.13))
      a.jurisdictionReach = Math.max(5, Math.min(65, a.jurisdictionReach + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
