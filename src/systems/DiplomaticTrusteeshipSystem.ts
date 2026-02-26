// Diplomatic Trusteeship System (v3.541) - Trusteeship governance
// Civilizations governing territories in trust for weaker nations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type TrusteeshipForm = 'administrative_trust' | 'economic_trust' | 'military_trust' | 'cultural_trust'

export interface TrusteeshipArrangement {
  id: number
  trusteeCivId: number
  beneficiaryCivId: number
  form: TrusteeshipForm
  governanceScope: number
  developmentAid: number
  selfRuleProgress: number
  legitimacyLevel: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2560
const PROCEED_CHANCE = 0.0020
const MAX_ARRANGEMENTS = 16

const FORMS: TrusteeshipForm[] = ['administrative_trust', 'economic_trust', 'military_trust', 'cultural_trust']

export class DiplomaticTrusteeshipSystem {
  private arrangements: TrusteeshipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const trustee = 1 + Math.floor(Math.random() * 8)
      const beneficiary = 1 + Math.floor(Math.random() * 8)
      if (trustee === beneficiary) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        trusteeCivId: trustee,
        beneficiaryCivId: beneficiary,
        form,
        governanceScope: 20 + Math.random() * 40,
        developmentAid: 25 + Math.random() * 35,
        selfRuleProgress: 10 + Math.random() * 30,
        legitimacyLevel: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.governanceScope = Math.max(5, Math.min(85, a.governanceScope + (Math.random() - 0.48) * 0.12))
      a.developmentAid = Math.max(10, Math.min(90, a.developmentAid + (Math.random() - 0.5) * 0.11))
      a.selfRuleProgress = Math.max(5, Math.min(80, a.selfRuleProgress + (Math.random() - 0.42) * 0.13))
      a.legitimacyLevel = Math.max(5, Math.min(65, a.legitimacyLevel + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): TrusteeshipArrangement[] { return this.arrangements }
}
