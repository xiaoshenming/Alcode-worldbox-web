// Diplomatic Dominion System (v3.502) - Dominion relations
// Self-governing territories under the sovereignty of a larger civilization

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type DominionForm = 'colonial_dominion' | 'vassal_state' | 'autonomous_region' | 'tributary_dominion'

export interface DominionRelation {
  id: number
  civIdA: number
  civIdB: number
  form: DominionForm
  selfGovernance: number
  imperialControl: number
  economicTies: number
  culturalAssimilation: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2550
const PROCEED_CHANCE = 0.0020
const MAX_RELATIONS = 16

const FORMS: DominionForm[] = ['colonial_dominion', 'vassal_state', 'autonomous_region', 'tributary_dominion']

export class DiplomaticDominionSystem {
  private relations: DominionRelation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.relations.length < MAX_RELATIONS && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.relations.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        selfGovernance: 25 + Math.random() * 40,
        imperialControl: 20 + Math.random() * 35,
        economicTies: 15 + Math.random() * 30,
        culturalAssimilation: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const r of this.relations) {
      r.duration += 1
      r.selfGovernance = Math.max(10, Math.min(90, r.selfGovernance + (Math.random() - 0.47) * 0.12))
      r.imperialControl = Math.max(10, Math.min(85, r.imperialControl + (Math.random() - 0.5) * 0.11))
      r.economicTies = Math.max(5, Math.min(75, r.economicTies + (Math.random() - 0.45) * 0.10))
      r.culturalAssimilation = Math.max(5, Math.min(65, r.culturalAssimilation + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 96000
    for (let i = this.relations.length - 1; i >= 0; i--) {
      if (this.relations[i].tick < cutoff) this.relations.splice(i, 1)
    }
  }

}
