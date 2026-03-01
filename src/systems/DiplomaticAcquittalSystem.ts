// Diplomatic Acquittal System (v3.397) - Acquittal verdicts
// Formal declarations of innocence clearing civilizations of charges

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AcquittalForm = 'war_crime_clearing' | 'treaty_violation_dismissal' | 'espionage_acquittal' | 'sabotage_exculpation'

export interface AcquittalVerdict {
  id: number
  civIdA: number
  civIdB: number
  form: AcquittalForm
  evidenceStrength: number
  legitimacy: number
  relationRepair: number
  precedentValue: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2440
const VERDICT_CHANCE = 0.0024
const MAX_VERDICTS = 20

const FORMS: AcquittalForm[] = ['war_crime_clearing', 'treaty_violation_dismissal', 'espionage_acquittal', 'sabotage_exculpation']

export class DiplomaticAcquittalSystem {
  private verdicts: AcquittalVerdict[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.verdicts.length < MAX_VERDICTS && Math.random() < VERDICT_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.verdicts.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        evidenceStrength: 30 + Math.random() * 40,
        legitimacy: 25 + Math.random() * 35,
        relationRepair: 15 + Math.random() * 30,
        precedentValue: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const v of this.verdicts) {
      v.duration += 1
      v.evidenceStrength = Math.max(15, Math.min(90, v.evidenceStrength + (Math.random() - 0.47) * 0.11))
      v.legitimacy = Math.max(10, Math.min(85, v.legitimacy + (Math.random() - 0.5) * 0.12))
      v.relationRepair = Math.max(5, Math.min(75, v.relationRepair + (Math.random() - 0.45) * 0.10))
      v.precedentValue = Math.max(5, Math.min(65, v.precedentValue + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 86000
    for (let i = this.verdicts.length - 1; i >= 0; i--) {
      if (this.verdicts[i].tick < cutoff) this.verdicts.splice(i, 1)
    }
  }

}
