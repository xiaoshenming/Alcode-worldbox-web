// Diplomatic Sheriffalty System (v3.625) - Sheriffalty governance
// Sheriffs managing county law and royal authority between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type SheriffaltyForm = 'county_sheriffalty' | 'royal_sheriffalty' | 'judicial_sheriffalty' | 'military_sheriffalty'

export interface SheriffaltyArrangement {
  id: number
  countyCivId: number
  sheriffCivId: number
  form: SheriffaltyForm
  lawAuthority: number
  royalMandate: number
  judicialPower: number
  militaryLevy: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2760
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: SheriffaltyForm[] = ['county_sheriffalty', 'royal_sheriffalty', 'judicial_sheriffalty', 'military_sheriffalty']

export class DiplomaticSheriffaltySystem {
  private arrangements: SheriffaltyArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const county = 1 + Math.floor(Math.random() * 8)
      const sheriff = 1 + Math.floor(Math.random() * 8)
      if (county === sheriff) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        countyCivId: county,
        sheriffCivId: sheriff,
        form,
        lawAuthority: 20 + Math.random() * 40,
        royalMandate: 25 + Math.random() * 35,
        judicialPower: 10 + Math.random() * 30,
        militaryLevy: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.lawAuthority = Math.max(5, Math.min(85, a.lawAuthority + (Math.random() - 0.48) * 0.12))
      a.royalMandate = Math.max(10, Math.min(90, a.royalMandate + (Math.random() - 0.5) * 0.11))
      a.judicialPower = Math.max(5, Math.min(80, a.judicialPower + (Math.random() - 0.42) * 0.13))
      a.militaryLevy = Math.max(5, Math.min(65, a.militaryLevy + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
