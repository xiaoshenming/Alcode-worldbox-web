// Diplomatic Remission System (v3.394) - Remission of penalties
// Reduction or cancellation of penalties and debts between civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type RemissionForm = 'debt_reduction' | 'penalty_cancellation' | 'reparation_waiver' | 'fine_forgiveness'

export interface RemissionAct {
  id: number
  civIdA: number
  civIdB: number
  form: RemissionForm
  reductionAmount: number
  economicImpact: number
  gratitudeLevel: number
  fiscalStrain: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2420
const ACT_CHANCE = 0.0025
const MAX_ACTS = 20

const FORMS: RemissionForm[] = ['debt_reduction', 'penalty_cancellation', 'reparation_waiver', 'fine_forgiveness']

export class DiplomaticRemissionSystem {
  private acts: RemissionAct[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.acts.length < MAX_ACTS && Math.random() < ACT_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.acts.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        reductionAmount: 20 + Math.random() * 45,
        economicImpact: 15 + Math.random() * 30,
        gratitudeLevel: 20 + Math.random() * 35,
        fiscalStrain: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.acts) {
      a.duration += 1
      a.reductionAmount = Math.max(10, Math.min(85, a.reductionAmount + (Math.random() - 0.47) * 0.11))
      a.economicImpact = Math.max(5, Math.min(70, a.economicImpact + (Math.random() - 0.5) * 0.12))
      a.gratitudeLevel = Math.max(10, Math.min(80, a.gratitudeLevel + (Math.random() - 0.46) * 0.10))
      a.fiscalStrain = Math.max(5, Math.min(60, a.fiscalStrain + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 83000
    for (let i = this.acts.length - 1; i >= 0; i--) {
      if (this.acts[i].tick < cutoff) this.acts.splice(i, 1)
    }
  }

}
