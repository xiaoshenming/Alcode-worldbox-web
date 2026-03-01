// Diplomatic Mandate System (v3.529) - Mandate governance
// Diplomatic arrangements where one civilization governs territory on behalf of another

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MandateForm = 'administrative_mandate' | 'military_mandate' | 'economic_mandate' | 'developmental_mandate'

export interface MandateAgreement {
  id: number
  mandatoryCivId: number
  mandatedCivId: number
  form: MandateForm
  governanceLevel: number
  developmentRate: number
  localSatisfaction: number
  mandateEfficiency: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2560
const PROCEED_CHANCE = 0.0021
const MAX_AGREEMENTS = 16

const FORMS: MandateForm[] = ['administrative_mandate', 'military_mandate', 'economic_mandate', 'developmental_mandate']

export class DiplomaticMandateSystem {
  private agreements: MandateAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < PROCEED_CHANCE) {
      const mandatory = 1 + Math.floor(Math.random() * 8)
      const mandated = 1 + Math.floor(Math.random() * 8)
      if (mandatory === mandated) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.agreements.push({
        id: this.nextId++,
        mandatoryCivId: mandatory,
        mandatedCivId: mandated,
        form,
        governanceLevel: 25 + Math.random() * 40,
        developmentRate: 15 + Math.random() * 30,
        localSatisfaction: 20 + Math.random() * 35,
        mandateEfficiency: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.agreements) {
      a.duration += 1
      a.governanceLevel = Math.max(10, Math.min(90, a.governanceLevel + (Math.random() - 0.47) * 0.12))
      a.developmentRate = Math.max(5, Math.min(75, a.developmentRate + (Math.random() - 0.5) * 0.10))
      a.localSatisfaction = Math.max(10, Math.min(85, a.localSatisfaction + (Math.random() - 0.45) * 0.11))
      a.mandateEfficiency = Math.max(5, Math.min(65, a.mandateEfficiency + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 89000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

}
