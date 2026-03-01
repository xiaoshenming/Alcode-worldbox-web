// Diplomatic Mayoralty System (v3.601) - Mayoral governance
// Mayors administering towns and cities with chartered self-governance

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MayoraltyForm = 'lord_mayoralty' | 'elected_mayoralty' | 'hereditary_mayoralty' | 'appointed_mayoralty'

export interface MayoraltyArrangement {
  id: number
  charterCivId: number
  mayorCivId: number
  form: MayoraltyForm
  municipalAuthority: number
  marketRegulation: number
  guildOversight: number
  civilJurisdiction: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2720
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: MayoraltyForm[] = ['lord_mayoralty', 'elected_mayoralty', 'hereditary_mayoralty', 'appointed_mayoralty']

export class DiplomaticMayoraltySystem {
  private arrangements: MayoraltyArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const charter = 1 + Math.floor(Math.random() * 8)
      const mayor = 1 + Math.floor(Math.random() * 8)
      if (charter === mayor) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        charterCivId: charter,
        mayorCivId: mayor,
        form,
        municipalAuthority: 20 + Math.random() * 40,
        marketRegulation: 25 + Math.random() * 35,
        guildOversight: 10 + Math.random() * 30,
        civilJurisdiction: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.municipalAuthority = Math.max(5, Math.min(85, a.municipalAuthority + (Math.random() - 0.48) * 0.12))
      a.marketRegulation = Math.max(10, Math.min(90, a.marketRegulation + (Math.random() - 0.5) * 0.11))
      a.guildOversight = Math.max(5, Math.min(80, a.guildOversight + (Math.random() - 0.42) * 0.13))
      a.civilJurisdiction = Math.max(5, Math.min(65, a.civilJurisdiction + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
