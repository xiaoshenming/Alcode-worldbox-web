// Diplomatic Restitution System (v3.421) - Restitution diplomacy
// Return of territory, resources, or rights as part of diplomatic settlement

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type RestitutionForm = 'territorial_return' | 'resource_compensation' | 'rights_restoration' | 'cultural_repatriation'

export interface RestitutionAgreement {
  id: number
  civIdA: number
  civIdB: number
  form: RestitutionForm
  complianceRate: number
  fairnessIndex: number
  publicApproval: number
  enforcementStrength: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2490
const PROCEED_CHANCE = 0.0022
const MAX_AGREEMENTS = 20

const FORMS: RestitutionForm[] = ['territorial_return', 'resource_compensation', 'rights_restoration', 'cultural_repatriation']

export class DiplomaticRestitutionSystem {
  private agreements: RestitutionAgreement[] = []
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
        complianceRate: 25 + Math.random() * 35,
        fairnessIndex: 20 + Math.random() * 30,
        publicApproval: 15 + Math.random() * 35,
        enforcementStrength: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.agreements) {
      a.duration += 1
      a.complianceRate = Math.max(10, Math.min(85, a.complianceRate + (Math.random() - 0.47) * 0.11))
      a.fairnessIndex = Math.max(10, Math.min(80, a.fairnessIndex + (Math.random() - 0.48) * 0.10))
      a.publicApproval = Math.max(5, Math.min(85, a.publicApproval + (Math.random() - 0.46) * 0.12))
      a.enforcementStrength = Math.max(5, Math.min(70, a.enforcementStrength + (Math.random() - 0.45) * 0.09))
    }

    const cutoff = tick - 86000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

  getAgreements(): RestitutionAgreement[] { return this.agreements }
}
