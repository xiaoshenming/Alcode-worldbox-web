// Diplomatic Borsholder System (v3.691) - Borsholder governance
// Officers heading frankpledge groups and maintaining local order between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type BorsholderForm = 'royal_borsholder' | 'hundred_borsholder' | 'tithing_borsholder' | 'ward_borsholder'

export interface BorsholderArrangement {
  id: number
  pledgeCivId: number
  orderCivId: number
  form: BorsholderForm
  frankpledgeAuthority: number
  localOrder: number
  suretyObligation: number
  courtAttendance: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2940
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: BorsholderForm[] = ['royal_borsholder', 'hundred_borsholder', 'tithing_borsholder', 'ward_borsholder']

export class DiplomaticBorsholderSystem {
  private arrangements: BorsholderArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const pledge = 1 + Math.floor(Math.random() * 8)
      const order = 1 + Math.floor(Math.random() * 8)
      if (pledge === order) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        pledgeCivId: pledge,
        orderCivId: order,
        form,
        frankpledgeAuthority: 20 + Math.random() * 40,
        localOrder: 25 + Math.random() * 35,
        suretyObligation: 10 + Math.random() * 30,
        courtAttendance: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.frankpledgeAuthority = Math.max(5, Math.min(85, a.frankpledgeAuthority + (Math.random() - 0.48) * 0.12))
      a.localOrder = Math.max(10, Math.min(90, a.localOrder + (Math.random() - 0.5) * 0.11))
      a.suretyObligation = Math.max(5, Math.min(80, a.suretyObligation + (Math.random() - 0.42) * 0.13))
      a.courtAttendance = Math.max(5, Math.min(65, a.courtAttendance + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
