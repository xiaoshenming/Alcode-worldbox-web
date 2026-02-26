// Diplomatic Tribute System (v3.523) - Tribute arrangements
// Formal tribute payments between civilizations as diplomatic obligations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type TributeForm = 'gold_tribute' | 'resource_tribute' | 'labor_tribute' | 'military_tribute'

export interface TributeArrangement {
  id: number
  payerCivId: number
  receiverCivId: number
  form: TributeForm
  tributeAmount: number
  complianceRate: number
  resentmentLevel: number
  protectionValue: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2550
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: TributeForm[] = ['gold_tribute', 'resource_tribute', 'labor_tribute', 'military_tribute']

export class DiplomaticTributeSystem {
  private arrangements: TributeArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const payer = 1 + Math.floor(Math.random() * 8)
      const receiver = 1 + Math.floor(Math.random() * 8)
      if (payer === receiver) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        payerCivId: payer,
        receiverCivId: receiver,
        form,
        tributeAmount: 20 + Math.random() * 40,
        complianceRate: 25 + Math.random() * 35,
        resentmentLevel: 10 + Math.random() * 30,
        protectionValue: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.tributeAmount = Math.max(5, Math.min(85, a.tributeAmount + (Math.random() - 0.48) * 0.12))
      a.complianceRate = Math.max(10, Math.min(90, a.complianceRate + (Math.random() - 0.5) * 0.11))
      a.resentmentLevel = Math.max(5, Math.min(80, a.resentmentLevel + (Math.random() - 0.42) * 0.13))
      a.protectionValue = Math.max(5, Math.min(65, a.protectionValue + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): TributeArrangement[] { return this.arrangements }
}
