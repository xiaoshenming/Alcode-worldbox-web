// Diplomatic Sovereignty System (v3.508) - Sovereignty recognition
// Agreements between civilizations to recognize each other's sovereign rights

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type SovereigntyForm = 'territorial_sovereignty' | 'political_independence' | 'economic_autonomy' | 'cultural_self_determination'

export interface SovereigntyAgreement {
  id: number
  civIdA: number
  civIdB: number
  form: SovereigntyForm
  recognitionLevel: number
  respectIndex: number
  nonInterference: number
  mutualBenefit: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2520
const PROCEED_CHANCE = 0.0023
const MAX_AGREEMENTS = 18

const FORMS: SovereigntyForm[] = ['territorial_sovereignty', 'political_independence', 'economic_autonomy', 'cultural_self_determination']

export class DiplomaticSovereigntySystem {
  private agreements: SovereigntyAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.agreements.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        recognitionLevel: 25 + Math.random() * 40,
        respectIndex: 20 + Math.random() * 35,
        nonInterference: 15 + Math.random() * 30,
        mutualBenefit: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.agreements) {
      a.duration += 1
      a.recognitionLevel = Math.max(10, Math.min(90, a.recognitionLevel + (Math.random() - 0.47) * 0.12))
      a.respectIndex = Math.max(10, Math.min(85, a.respectIndex + (Math.random() - 0.5) * 0.11))
      a.nonInterference = Math.max(5, Math.min(75, a.nonInterference + (Math.random() - 0.45) * 0.10))
      a.mutualBenefit = Math.max(5, Math.min(65, a.mutualBenefit + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 92000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

}
