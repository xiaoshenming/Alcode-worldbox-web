// Diplomatic Chamberlainship System (v3.577) - Chamberlain governance
// Royal chamberlains managing court affairs and treasury between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ChamberlainshipForm = 'lord_chamberlainship' | 'great_chamberlainship' | 'papal_chamberlainship' | 'hereditary_chamberlainship'

export interface ChamberlainshipArrangement {
  id: number
  monarchCivId: number
  chamberlainCivId: number
  form: ChamberlainshipForm
  courtControl: number
  treasuryManagement: number
  ceremonialAuthority: number
  householdOversight: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2640
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: ChamberlainshipForm[] = ['lord_chamberlainship', 'great_chamberlainship', 'papal_chamberlainship', 'hereditary_chamberlainship']

export class DiplomaticChamberlainshipSystem {
  private arrangements: ChamberlainshipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const monarch = 1 + Math.floor(Math.random() * 8)
      const chamberlain = 1 + Math.floor(Math.random() * 8)
      if (monarch === chamberlain) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        monarchCivId: monarch,
        chamberlainCivId: chamberlain,
        form,
        courtControl: 20 + Math.random() * 40,
        treasuryManagement: 25 + Math.random() * 35,
        ceremonialAuthority: 10 + Math.random() * 30,
        householdOversight: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.courtControl = Math.max(5, Math.min(85, a.courtControl + (Math.random() - 0.48) * 0.12))
      a.treasuryManagement = Math.max(10, Math.min(90, a.treasuryManagement + (Math.random() - 0.5) * 0.11))
      a.ceremonialAuthority = Math.max(5, Math.min(80, a.ceremonialAuthority + (Math.random() - 0.42) * 0.13))
      a.householdOversight = Math.max(5, Math.min(65, a.householdOversight + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
