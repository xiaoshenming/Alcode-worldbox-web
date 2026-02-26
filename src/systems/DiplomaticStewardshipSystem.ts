// Diplomatic Stewardship System (v3.535) - Stewardship governance
// Caretaker governance where one civilization manages another's affairs

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type StewardshipForm = 'land_stewardship' | 'resource_stewardship' | 'cultural_stewardship' | 'military_stewardship'

export interface StewardshipAgreement {
  id: number
  stewardCivId: number
  beneficiaryCivId: number
  form: StewardshipForm
  managementLevel: number
  trustIndex: number
  efficiencyRate: number
  benefitShare: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2540
const PROCEED_CHANCE = 0.0022
const MAX_AGREEMENTS = 16

const FORMS: StewardshipForm[] = ['land_stewardship', 'resource_stewardship', 'cultural_stewardship', 'military_stewardship']

export class DiplomaticStewardshipSystem {
  private agreements: StewardshipAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < PROCEED_CHANCE) {
      const steward = 1 + Math.floor(Math.random() * 8)
      const beneficiary = 1 + Math.floor(Math.random() * 8)
      if (steward === beneficiary) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.agreements.push({
        id: this.nextId++,
        stewardCivId: steward,
        beneficiaryCivId: beneficiary,
        form,
        managementLevel: 25 + Math.random() * 40,
        trustIndex: 20 + Math.random() * 35,
        efficiencyRate: 15 + Math.random() * 30,
        benefitShare: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.agreements) {
      a.duration += 1
      a.managementLevel = Math.max(10, Math.min(90, a.managementLevel + (Math.random() - 0.47) * 0.12))
      a.trustIndex = Math.max(10, Math.min(85, a.trustIndex + (Math.random() - 0.5) * 0.11))
      a.efficiencyRate = Math.max(5, Math.min(75, a.efficiencyRate + (Math.random() - 0.45) * 0.10))
      a.benefitShare = Math.max(5, Math.min(65, a.benefitShare + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 91000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

  getAgreements(): StewardshipAgreement[] { return this.agreements }
}
