// Diplomatic Verderer System (v3.643) - Verderer governance
// Forest officers managing royal woodlands and hunting rights between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type VerdererForm = 'royal_verderer' | 'forest_verderer' | 'chase_verderer' | 'park_verderer'

export interface VerdererArrangement {
  id: number
  forestCivId: number
  verdererCivId: number
  form: VerdererForm
  forestJurisdiction: number
  huntingRights: number
  timberManagement: number
  wildlifeProtection: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2820
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: VerdererForm[] = ['royal_verderer', 'forest_verderer', 'chase_verderer', 'park_verderer']

export class DiplomaticVerdererSystem {
  private arrangements: VerdererArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const forest = 1 + Math.floor(Math.random() * 8)
      const verderer = 1 + Math.floor(Math.random() * 8)
      if (forest === verderer) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        forestCivId: forest,
        verdererCivId: verderer,
        form,
        forestJurisdiction: 20 + Math.random() * 40,
        huntingRights: 25 + Math.random() * 35,
        timberManagement: 10 + Math.random() * 30,
        wildlifeProtection: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.forestJurisdiction = Math.max(5, Math.min(85, a.forestJurisdiction + (Math.random() - 0.48) * 0.12))
      a.huntingRights = Math.max(10, Math.min(90, a.huntingRights + (Math.random() - 0.5) * 0.11))
      a.timberManagement = Math.max(5, Math.min(80, a.timberManagement + (Math.random() - 0.42) * 0.13))
      a.wildlifeProtection = Math.max(5, Math.min(65, a.wildlifeProtection + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): VerdererArrangement[] { return this.arrangements }
}
