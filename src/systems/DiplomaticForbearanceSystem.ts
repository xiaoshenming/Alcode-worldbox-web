// Diplomatic Forbearance System (v3.376) - Forbearance agreements
// Patient restraint from enforcing rights or retaliating against provocations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ForbearanceForm = 'restraint_pact' | 'provocation_tolerance' | 'delayed_response' | 'measured_patience'

export interface ForbearanceAgreement {
  id: number
  civIdA: number
  civIdB: number
  form: ForbearanceForm
  patience: number
  stabilityEffect: number
  trustBuilding: number
  strainLevel: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2380
const AGREE_CHANCE = 0.0025
const MAX_AGREEMENTS = 20

const FORMS: ForbearanceForm[] = ['restraint_pact', 'provocation_tolerance', 'delayed_response', 'measured_patience']

export class DiplomaticForbearanceSystem {
  private agreements: ForbearanceAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < AGREE_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.agreements.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        patience: 30 + Math.random() * 40,
        stabilityEffect: 20 + Math.random() * 30,
        trustBuilding: 15 + Math.random() * 25,
        strainLevel: 5 + Math.random() * 20,
        duration: 0,
        tick,
      })
    }

    for (const a of this.agreements) {
      a.duration += 1
      a.patience = Math.max(10, Math.min(90, a.patience + (Math.random() - 0.48) * 0.11))
      a.stabilityEffect = Math.max(10, Math.min(80, a.stabilityEffect + (Math.random() - 0.5) * 0.13))
      a.trustBuilding = Math.max(5, Math.min(70, a.trustBuilding + (Math.random() - 0.45) * 0.10))
      a.strainLevel = Math.max(0, Math.min(60, a.strainLevel + (Math.random() - 0.42) * 0.12))
    }

    const cutoff = tick - 84000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

}
