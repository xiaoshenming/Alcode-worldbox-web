// Diplomatic Receivership System (v3.556) - Receivership governance
// External administration of failing civilizations' affairs

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ReceivershipForm = 'economic_receivership' | 'territorial_receivership' | 'military_receivership' | 'institutional_receivership'

export interface ReceivershipArrangement {
  id: number
  receiverCivId: number
  debtorCivId: number
  form: ReceivershipForm
  assetControl: number
  debtRecovery: number
  operationalScope: number
  legitimacyLevel: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2570
const PROCEED_CHANCE = 0.0020
const MAX_ARRANGEMENTS = 16

const FORMS: ReceivershipForm[] = ['economic_receivership', 'territorial_receivership', 'military_receivership', 'institutional_receivership']

export class DiplomaticReceivershipSystem {
  private arrangements: ReceivershipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const receiver = 1 + Math.floor(Math.random() * 8)
      const debtor = 1 + Math.floor(Math.random() * 8)
      if (receiver === debtor) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        receiverCivId: receiver,
        debtorCivId: debtor,
        form,
        assetControl: 20 + Math.random() * 40,
        debtRecovery: 25 + Math.random() * 35,
        operationalScope: 10 + Math.random() * 30,
        legitimacyLevel: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.assetControl = Math.max(5, Math.min(85, a.assetControl + (Math.random() - 0.48) * 0.12))
      a.debtRecovery = Math.max(10, Math.min(90, a.debtRecovery + (Math.random() - 0.5) * 0.11))
      a.operationalScope = Math.max(5, Math.min(80, a.operationalScope + (Math.random() - 0.42) * 0.13))
      a.legitimacyLevel = Math.max(5, Math.min(65, a.legitimacyLevel + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
