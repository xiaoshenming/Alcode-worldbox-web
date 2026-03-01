// Diplomatic Parkward System (v3.661) - Parkward governance
// Officers managing enclosed parklands and deer reserves between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ParkwardForm = 'royal_parkward' | 'noble_parkward' | 'chase_parkward' | 'forest_parkward'

export interface ParkwardArrangement {
  id: number
  parkCivId: number
  wardCivId: number
  form: ParkwardForm
  parkJurisdiction: number
  deerRights: number
  enclosureManagement: number
  grazingControl: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2840
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: ParkwardForm[] = ['royal_parkward', 'noble_parkward', 'chase_parkward', 'forest_parkward']

export class DiplomaticParkwardSystem {
  private arrangements: ParkwardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const park = 1 + Math.floor(Math.random() * 8)
      const ward = 1 + Math.floor(Math.random() * 8)
      if (park === ward) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        parkCivId: park,
        wardCivId: ward,
        form,
        parkJurisdiction: 20 + Math.random() * 40,
        deerRights: 25 + Math.random() * 35,
        enclosureManagement: 10 + Math.random() * 30,
        grazingControl: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.parkJurisdiction = Math.max(5, Math.min(85, a.parkJurisdiction + (Math.random() - 0.48) * 0.12))
      a.deerRights = Math.max(10, Math.min(90, a.deerRights + (Math.random() - 0.5) * 0.11))
      a.enclosureManagement = Math.max(5, Math.min(80, a.enclosureManagement + (Math.random() - 0.42) * 0.13))
      a.grazingControl = Math.max(5, Math.min(65, a.grazingControl + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
