// Diplomatic Reparation System (v3.265) - War reparation agreements
// Post-conflict agreements where defeated civilizations pay compensation to victors

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ReparationType = 'monetary' | 'territorial' | 'resource' | 'labor'

export interface ReparationAgreement {
  id: number
  payerCivId: number
  receiverCivId: number
  reparationType: ReparationType
  totalOwed: number
  amountPaid: number
  resentment: number
  enforcementLevel: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2500
const TREATY_CHANCE = 0.003
const MAX_AGREEMENTS = 24

const TYPES: ReparationType[] = ['monetary', 'territorial', 'resource', 'labor']

export class DiplomaticReparationSystem {
  private agreements: ReparationAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < TREATY_CHANCE) {
      const payer = 1 + Math.floor(Math.random() * 8)
      const receiver = 1 + Math.floor(Math.random() * 8)
      if (payer === receiver) return

      const rType = TYPES[Math.floor(Math.random() * TYPES.length)]

      this.agreements.push({
        id: this.nextId++,
        payerCivId: payer,
        receiverCivId: receiver,
        reparationType: rType,
        totalOwed: 100 + Math.random() * 500,
        amountPaid: 0,
        resentment: 40 + Math.random() * 40,
        enforcementLevel: 30 + Math.random() * 50,
        duration: 0,
        tick,
      })
    }

    for (const agreement of this.agreements) {
      agreement.duration += 1
      const payment = Math.random() * 0.5
      agreement.amountPaid = Math.min(agreement.totalOwed, agreement.amountPaid + payment)
      agreement.resentment = Math.max(5, Math.min(100, agreement.resentment + (Math.random() - 0.4) * 0.15))
      agreement.enforcementLevel = Math.max(10, Math.min(100, agreement.enforcementLevel + (Math.random() - 0.5) * 0.1))
    }

    const cutoff = tick - 80000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

  getAgreements(): ReparationAgreement[] { return this.agreements }
}
