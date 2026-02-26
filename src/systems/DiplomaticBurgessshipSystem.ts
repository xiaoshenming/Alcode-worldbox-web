// Diplomatic Burgessship System (v3.607) - Burgess governance
// Burgesses representing chartered boroughs in inter-territorial assemblies

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type BurgessshipForm = 'parliamentary_burgessship' | 'guild_burgessship' | 'merchant_burgessship' | 'craft_burgessship'

export interface BurgessshipArrangement {
  id: number
  boroughCivId: number
  burgessCivId: number
  form: BurgessshipForm
  parliamentaryVoice: number
  tradePrivilege: number
  boroughRepresentation: number
  charterDefense: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2740
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: BurgessshipForm[] = ['parliamentary_burgessship', 'guild_burgessship', 'merchant_burgessship', 'craft_burgessship']

export class DiplomaticBurgessshipSystem {
  private arrangements: BurgessshipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const borough = 1 + Math.floor(Math.random() * 8)
      const burgess = 1 + Math.floor(Math.random() * 8)
      if (borough === burgess) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        boroughCivId: borough,
        burgessCivId: burgess,
        form,
        parliamentaryVoice: 20 + Math.random() * 40,
        tradePrivilege: 25 + Math.random() * 35,
        boroughRepresentation: 10 + Math.random() * 30,
        charterDefense: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.parliamentaryVoice = Math.max(5, Math.min(85, a.parliamentaryVoice + (Math.random() - 0.48) * 0.12))
      a.tradePrivilege = Math.max(10, Math.min(90, a.tradePrivilege + (Math.random() - 0.5) * 0.11))
      a.boroughRepresentation = Math.max(5, Math.min(80, a.boroughRepresentation + (Math.random() - 0.42) * 0.13))
      a.charterDefense = Math.max(5, Math.min(65, a.charterDefense + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): BurgessshipArrangement[] { return this.arrangements }
}
