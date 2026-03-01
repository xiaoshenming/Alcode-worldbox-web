// Diplomatic Pardon System (v3.442) - Pardon diplomacy
// Official forgiveness of diplomatic offenses and restoration of relations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type PardonForm = 'unconditional_pardon' | 'conditional_pardon' | 'posthumous_pardon' | 'collective_pardon'

export interface PardonDecree {
  id: number
  civIdA: number
  civIdB: number
  form: PardonForm
  forgivenessDepth: number
  publicSupport: number
  politicalCapital: number
  reconciliationEffect: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2520
const PROCEED_CHANCE = 0.0022
const MAX_DECREES = 20

const FORMS: PardonForm[] = ['unconditional_pardon', 'conditional_pardon', 'posthumous_pardon', 'collective_pardon']

export class DiplomaticPardonSystem {
  private decrees: PardonDecree[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.decrees.length < MAX_DECREES && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.decrees.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        forgivenessDepth: 20 + Math.random() * 35,
        publicSupport: 15 + Math.random() * 35,
        politicalCapital: 20 + Math.random() * 30,
        reconciliationEffect: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const d of this.decrees) {
      d.duration += 1
      d.forgivenessDepth = Math.max(10, Math.min(85, d.forgivenessDepth + (Math.random() - 0.46) * 0.12))
      d.publicSupport = Math.max(5, Math.min(80, d.publicSupport + (Math.random() - 0.48) * 0.11))
      d.politicalCapital = Math.max(10, Math.min(75, d.politicalCapital + (Math.random() - 0.47) * 0.10))
      d.reconciliationEffect = Math.max(5, Math.min(70, d.reconciliationEffect + (Math.random() - 0.45) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.decrees.length - 1; i >= 0; i--) {
      if (this.decrees[i].tick < cutoff) this.decrees.splice(i, 1)
    }
  }

}
