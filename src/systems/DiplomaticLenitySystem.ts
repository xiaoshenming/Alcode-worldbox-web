// Diplomatic Lenity System (v3.379) - Lenity policies
// Mild and merciful treatment in diplomatic relations and justice

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type LenityForm = 'reduced_penalties' | 'gentle_enforcement' | 'compassionate_ruling' | 'mild_sanctions'

export interface LenityPolicy {
  id: number
  civIdA: number
  civIdB: number
  form: LenityForm
  mildness: number
  publicApproval: number
  justiceBalance: number
  precedentWeight: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2400
const POLICY_CHANCE = 0.0026
const MAX_POLICIES = 20

const FORMS: LenityForm[] = ['reduced_penalties', 'gentle_enforcement', 'compassionate_ruling', 'mild_sanctions']

export class DiplomaticLenitySystem {
  private policies: LenityPolicy[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.policies.length < MAX_POLICIES && Math.random() < POLICY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.policies.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        mildness: 25 + Math.random() * 35,
        publicApproval: 20 + Math.random() * 30,
        justiceBalance: 15 + Math.random() * 30,
        precedentWeight: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const p of this.policies) {
      p.duration += 1
      p.mildness = Math.max(10, Math.min(85, p.mildness + (Math.random() - 0.47) * 0.12))
      p.publicApproval = Math.max(10, Math.min(80, p.publicApproval + (Math.random() - 0.5) * 0.13))
      p.justiceBalance = Math.max(5, Math.min(75, p.justiceBalance + (Math.random() - 0.46) * 0.10))
      p.precedentWeight = Math.max(5, Math.min(60, p.precedentWeight + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 83000
    for (let i = this.policies.length - 1; i >= 0; i--) {
      if (this.policies[i].tick < cutoff) this.policies.splice(i, 1)
    }
  }

}
