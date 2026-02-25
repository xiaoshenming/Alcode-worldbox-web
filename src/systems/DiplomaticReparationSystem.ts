// Diplomatic Reparation System (v3.424) - Reparation diplomacy
// Compensation payments and amends between civilizations after conflicts

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ReparationForm = 'war_indemnity' | 'resource_transfer' | 'labor_service' | 'symbolic_amends'

export interface ReparationAgreement {
  id: number
  civIdA: number
  civIdB: number
  form: ReparationForm
  paymentProgress: number
  debtRemaining: number
  resentmentLevel: number
  complianceRate: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2510
const PROCEED_CHANCE = 0.0023
const MAX_AGREEMENTS = 20

const FORMS: ReparationForm[] = ['war_indemnity', 'resource_transfer', 'labor_service', 'symbolic_amends']

export class DiplomaticReparationSystem {
  private agreements: ReparationAgreement[] = []
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
        paymentProgress: 5 + Math.random() * 20,
        debtRemaining: 40 + Math.random() * 50,
        resentmentLevel: 20 + Math.random() * 35,
        complianceRate: 25 + Math.random() * 30,
        duration: 0,
        tick,
      })
    }

    for (const a of this.agreements) {
      a.duration += 1
      a.paymentProgress = Math.max(0, Math.min(100, a.paymentProgress + (Math.random() - 0.4) * 0.13))
      a.debtRemaining = Math.max(0, a.debtRemaining - 0.00008)
      a.resentmentLevel = Math.max(5, Math.min(80, a.resentmentLevel + (Math.random() - 0.52) * 0.11))
      a.complianceRate = Math.max(10, Math.min(85, a.complianceRate + (Math.random() - 0.47) * 0.10))
    }

    const cutoff = tick - 89000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

  getAgreements(): ReparationAgreement[] { return this.agreements }
}
