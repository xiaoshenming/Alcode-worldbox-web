// Diplomatic Clemency System (v3.370) - Clemency acts
// Acts of mercy and leniency toward defeated or captured enemies

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ClemencyForm = 'pardon' | 'commutation' | 'amnesty' | 'reprieve'

export interface ClemencyAct {
  id: number
  civIdA: number
  civIdB: number
  form: ClemencyForm
  mercyLevel: number
  publicPerception: number
  reconciliationEffect: number
  precedentValue: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2340
const ACT_CHANCE = 0.0027
const MAX_ACTS = 20

const FORMS: ClemencyForm[] = ['pardon', 'commutation', 'amnesty', 'reprieve']

export class DiplomaticClemencySystem {
  private acts: ClemencyAct[] = []
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
        mercyLevel: 25 + Math.random() * 40,
        publicPerception: 20 + Math.random() * 35,
        reconciliationEffect: 15 + Math.random() * 30,
        precedentValue: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.acts) {
      a.duration += 1
      a.mercyLevel = Math.max(10, Math.min(90, a.mercyLevel + (Math.random() - 0.46) * 0.12))
      a.publicPerception = Math.max(10, Math.min(85, a.publicPerception + (Math.random() - 0.5) * 0.14))
      a.reconciliationEffect = Math.max(5, Math.min(75, a.reconciliationEffect + (Math.random() - 0.45) * 0.11))
      a.precedentValue = Math.max(5, Math.min(65, a.precedentValue + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 85000
    for (let i = this.acts.length - 1; i >= 0; i--) {
      if (this.acts[i].tick < cutoff) this.acts.splice(i, 1)
    }
  }

}
