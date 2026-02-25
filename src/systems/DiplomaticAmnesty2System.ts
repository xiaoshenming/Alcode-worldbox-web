// Diplomatic Amnesty System (v3.436) - Amnesty diplomacy
// General pardon for past offenses granted between civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type Amnesty2Form = 'general_pardon' | 'political_amnesty' | 'war_prisoner_release' | 'exile_recall'

export interface Amnesty2Decree {
  id: number
  civIdA: number
  civIdB: number
  form: Amnesty2Form
  coverageScope: number
  publicRelief: number
  politicalCost: number
  stabilityEffect: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2480
const PROCEED_CHANCE = 0.0022
const MAX_DECREES = 20

const FORMS: Amnesty2Form[] = ['general_pardon', 'political_amnesty', 'war_prisoner_release', 'exile_recall']

export class DiplomaticAmnesty2System {
  private decrees: Amnesty2Decree[] = []
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
        coverageScope: 25 + Math.random() * 35,
        publicRelief: 20 + Math.random() * 30,
        politicalCost: 15 + Math.random() * 30,
        stabilityEffect: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const d of this.decrees) {
      d.duration += 1
      d.coverageScope = Math.max(10, Math.min(85, d.coverageScope + (Math.random() - 0.47) * 0.11))
      d.publicRelief = Math.max(10, Math.min(80, d.publicRelief + (Math.random() - 0.46) * 0.12))
      d.politicalCost = Math.max(5, Math.min(70, d.politicalCost + (Math.random() - 0.5) * 0.10))
      d.stabilityEffect = Math.max(5, Math.min(65, d.stabilityEffect + (Math.random() - 0.48) * 0.09))
    }

    const cutoff = tick - 85000
    for (let i = this.decrees.length - 1; i >= 0; i--) {
      if (this.decrees[i].tick < cutoff) this.decrees.splice(i, 1)
    }
  }

  getDecrees(): Amnesty2Decree[] { return this.decrees }
}
