// Diplomatic Autonomy System (v3.517) - Autonomy agreements
// Diplomatic arrangements granting self-governance within larger political structures

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AutonomyForm = 'administrative_autonomy' | 'fiscal_independence' | 'judicial_sovereignty' | 'legislative_freedom'

export interface AutonomyAgreement {
  id: number
  grantorCivId: number
  autonomousCivId: number
  form: AutonomyForm
  selfGovLevel: number
  complianceRate: number
  freedomIndex: number
  stabilityFactor: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2530
const PROCEED_CHANCE = 0.0022
const MAX_AGREEMENTS = 16

const FORMS: AutonomyForm[] = ['administrative_autonomy', 'fiscal_independence', 'judicial_sovereignty', 'legislative_freedom']

export class DiplomaticAutonomySystem {
  private agreements: AutonomyAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < PROCEED_CHANCE) {
      const grantor = 1 + Math.floor(Math.random() * 8)
      const autonomous = 1 + Math.floor(Math.random() * 8)
      if (grantor === autonomous) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.agreements.push({
        id: this.nextId++,
        grantorCivId: grantor,
        autonomousCivId: autonomous,
        form,
        selfGovLevel: 25 + Math.random() * 40,
        complianceRate: 20 + Math.random() * 30,
        freedomIndex: 15 + Math.random() * 35,
        stabilityFactor: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.agreements) {
      a.duration += 1
      a.selfGovLevel = Math.max(10, Math.min(90, a.selfGovLevel + (Math.random() - 0.47) * 0.12))
      a.complianceRate = Math.max(10, Math.min(80, a.complianceRate + (Math.random() - 0.5) * 0.10))
      a.freedomIndex = Math.max(5, Math.min(85, a.freedomIndex + (Math.random() - 0.45) * 0.11))
      a.stabilityFactor = Math.max(5, Math.min(65, a.stabilityFactor + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 89000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

  getAgreements(): AutonomyAgreement[] { return this.agreements }
}
