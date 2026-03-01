// Diplomatic Indemnity System (v3.275) - Compensation for damages or losses
// Agreements where one civilization compensates another for incurred damages

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type IndemnityType = 'war_damages' | 'trade_losses' | 'border_violations' | 'civilian_harm'

export interface IndemnityAgreement {
  id: number
  payerCivId: number
  receiverCivId: number
  indemnityType: IndemnityType
  totalAmount: number
  amountPaid: number
  goodwill: number
  enforcementStrength: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2500
const TREATY_CHANCE = 0.0028
const MAX_AGREEMENTS = 22

const TYPES: IndemnityType[] = ['war_damages', 'trade_losses', 'border_violations', 'civilian_harm']

export class DiplomaticIndemnitySystem {
  private agreements: IndemnityAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < TREATY_CHANCE) {
      const payer = 1 + Math.floor(Math.random() * 8)
      const receiver = 1 + Math.floor(Math.random() * 8)
      if (payer === receiver) return

      const iType = TYPES[Math.floor(Math.random() * TYPES.length)]

      this.agreements.push({
        id: this.nextId++,
        payerCivId: payer,
        receiverCivId: receiver,
        indemnityType: iType,
        totalAmount: 80 + Math.random() * 400,
        amountPaid: 0,
        goodwill: 20 + Math.random() * 30,
        enforcementStrength: 30 + Math.random() * 45,
        duration: 0,
        tick,
      })
    }

    for (const agreement of this.agreements) {
      agreement.duration += 1
      const payment = Math.random() * 0.4
      agreement.amountPaid = Math.min(agreement.totalAmount, agreement.amountPaid + payment)
      agreement.goodwill = Math.max(5, Math.min(100, agreement.goodwill + (Math.random() - 0.45) * 0.18))
      agreement.enforcementStrength = Math.max(10, Math.min(100, agreement.enforcementStrength + (Math.random() - 0.5) * 0.12))
    }

    const cutoff = tick - 78000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

}
