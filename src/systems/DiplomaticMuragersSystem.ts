// Diplomatic Muragers System (v3.700) - Murager governance
// Officers collecting wall-building taxes and managing fortification funds between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MuragerForm = 'royal_murager' | 'borough_murager' | 'castle_murager' | 'city_murager'

export interface MuragerArrangement {
  id: number
  wallCivId: number
  taxCivId: number
  form: MuragerForm
  wallTaxAuthority: number
  fortificationFund: number
  repairSchedule: number
  defenseAllocation: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2970
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: MuragerForm[] = ['royal_murager', 'borough_murager', 'castle_murager', 'city_murager']

export class DiplomaticMuragersSystem {
  private arrangements: MuragerArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const wall = 1 + Math.floor(Math.random() * 8)
      const tax = 1 + Math.floor(Math.random() * 8)
      if (wall === tax) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        wallCivId: wall,
        taxCivId: tax,
        form,
        wallTaxAuthority: 20 + Math.random() * 40,
        fortificationFund: 25 + Math.random() * 35,
        repairSchedule: 10 + Math.random() * 30,
        defenseAllocation: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.wallTaxAuthority = Math.max(5, Math.min(85, a.wallTaxAuthority + (Math.random() - 0.48) * 0.12))
      a.fortificationFund = Math.max(10, Math.min(90, a.fortificationFund + (Math.random() - 0.5) * 0.11))
      a.repairSchedule = Math.max(5, Math.min(80, a.repairSchedule + (Math.random() - 0.42) * 0.13))
      a.defenseAllocation = Math.max(5, Math.min(65, a.defenseAllocation + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): MuragerArrangement[] { return this.arrangements }
}
