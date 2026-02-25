// Diplomatic Immunity System (v3.400) - Immunity agreements
// Formal grants of protection from prosecution or retaliation

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ImmunityForm = 'diplomatic_protection' | 'envoy_immunity' | 'trade_delegate_shield' | 'cultural_exchange_cover'

export interface ImmunityAgreement {
  id: number
  civIdA: number
  civIdB: number
  form: ImmunityForm
  protectionLevel: number
  reciprocity: number
  abuseRisk: number
  diplomaticValue: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2360
const AGREE_CHANCE = 0.0026
const MAX_AGREEMENTS = 20

const FORMS: ImmunityForm[] = ['diplomatic_protection', 'envoy_immunity', 'trade_delegate_shield', 'cultural_exchange_cover']

export class DiplomaticImmunitySystem {
  private agreements: ImmunityAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < AGREE_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.agreements.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        protectionLevel: 30 + Math.random() * 40,
        reciprocity: 25 + Math.random() * 35,
        abuseRisk: 5 + Math.random() * 20,
        diplomaticValue: 20 + Math.random() * 30,
        duration: 0,
        tick,
      })
    }

    for (const a of this.agreements) {
      a.duration += 1
      a.protectionLevel = Math.max(15, Math.min(90, a.protectionLevel + (Math.random() - 0.47) * 0.11))
      a.reciprocity = Math.max(10, Math.min(85, a.reciprocity + (Math.random() - 0.5) * 0.12))
      a.abuseRisk = Math.max(0, Math.min(50, a.abuseRisk + (Math.random() - 0.42) * 0.10))
      a.diplomaticValue = Math.max(10, Math.min(75, a.diplomaticValue + (Math.random() - 0.45) * 0.09))
    }

    const cutoff = tick - 87000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

  getAgreements(): ImmunityAgreement[] { return this.agreements }
}
