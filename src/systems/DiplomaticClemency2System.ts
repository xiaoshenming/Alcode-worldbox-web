// Diplomatic Clemency System (v3.439) - Clemency diplomacy
// Merciful reduction of diplomatic penalties and sanctions

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type Clemency2Form = 'sanction_reduction' | 'penalty_commutation' | 'embargo_easing' | 'tribute_forgiveness'

export interface Clemency2Act {
  id: number
  civIdA: number
  civIdB: number
  form: Clemency2Form
  mercyLevel: number
  recipientGratitude: number
  thirdPartyReaction: number
  precedentRisk: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2500
const PROCEED_CHANCE = 0.0023
const MAX_ACTS = 20

const FORMS: Clemency2Form[] = ['sanction_reduction', 'penalty_commutation', 'embargo_easing', 'tribute_forgiveness']

export class DiplomaticClemency2System {
  private acts: Clemency2Act[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.acts.length < MAX_ACTS && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.acts.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        mercyLevel: 25 + Math.random() * 35,
        recipientGratitude: 20 + Math.random() * 30,
        thirdPartyReaction: 15 + Math.random() * 30,
        precedentRisk: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.acts) {
      a.duration += 1
      a.mercyLevel = Math.max(10, Math.min(85, a.mercyLevel + (Math.random() - 0.46) * 0.12))
      a.recipientGratitude = Math.max(10, Math.min(80, a.recipientGratitude + (Math.random() - 0.47) * 0.11))
      a.thirdPartyReaction = Math.max(5, Math.min(75, a.thirdPartyReaction + (Math.random() - 0.5) * 0.10))
      a.precedentRisk = Math.max(5, Math.min(65, a.precedentRisk + (Math.random() - 0.48) * 0.09))
    }

    const cutoff = tick - 87000
    for (let i = this.acts.length - 1; i >= 0; i--) {
      if (this.acts[i].tick < cutoff) this.acts.splice(i, 1)
    }
  }

}
