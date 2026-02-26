// Diplomatic Sheriffdom System (v3.586) - Sheriff governance
// Sheriffs administering counties and enforcing royal writs between territories

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type SheriffdomForm = 'high_sheriffdom' | 'county_sheriffdom' | 'hereditary_sheriffdom' | 'appointed_sheriffdom'

export interface SheriffdomArrangement {
  id: number
  crownCivId: number
  sheriffCivId: number
  form: SheriffdomForm
  writEnforcement: number
  countyAdministration: number
  taxCollection: number
  courtPresidency: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2670
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: SheriffdomForm[] = ['high_sheriffdom', 'county_sheriffdom', 'hereditary_sheriffdom', 'appointed_sheriffdom']

export class DiplomaticSheriffdomSystem {
  private arrangements: SheriffdomArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const crown = 1 + Math.floor(Math.random() * 8)
      const sheriff = 1 + Math.floor(Math.random() * 8)
      if (crown === sheriff) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        crownCivId: crown,
        sheriffCivId: sheriff,
        form,
        writEnforcement: 20 + Math.random() * 40,
        countyAdministration: 25 + Math.random() * 35,
        taxCollection: 10 + Math.random() * 30,
        courtPresidency: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.writEnforcement = Math.max(5, Math.min(85, a.writEnforcement + (Math.random() - 0.48) * 0.12))
      a.countyAdministration = Math.max(10, Math.min(90, a.countyAdministration + (Math.random() - 0.5) * 0.11))
      a.taxCollection = Math.max(5, Math.min(80, a.taxCollection + (Math.random() - 0.42) * 0.13))
      a.courtPresidency = Math.max(5, Math.min(65, a.courtPresidency + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): SheriffdomArrangement[] { return this.arrangements }
}
