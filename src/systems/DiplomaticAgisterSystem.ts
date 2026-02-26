// Diplomatic Agister System (v3.652) - Agistment governance
// Officers managing pasture rental and livestock boarding between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AgisterForm = 'crown_agistment' | 'forest_agistment' | 'common_agistment' | 'private_agistment'

export interface AgisterArrangement {
  id: number
  pastureCivId: number
  agisterCivId: number
  form: AgisterForm
  pastureAllocation: number
  livestockCapacity: number
  rentalRevenue: number
  grazingQuality: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2850
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: AgisterForm[] = ['crown_agistment', 'forest_agistment', 'common_agistment', 'private_agistment']

export class DiplomaticAgisterSystem {
  private arrangements: AgisterArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const pasture = 1 + Math.floor(Math.random() * 8)
      const agister = 1 + Math.floor(Math.random() * 8)
      if (pasture === agister) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        pastureCivId: pasture,
        agisterCivId: agister,
        form,
        pastureAllocation: 20 + Math.random() * 40,
        livestockCapacity: 25 + Math.random() * 35,
        rentalRevenue: 10 + Math.random() * 30,
        grazingQuality: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.pastureAllocation = Math.max(5, Math.min(85, a.pastureAllocation + (Math.random() - 0.48) * 0.12))
      a.livestockCapacity = Math.max(10, Math.min(90, a.livestockCapacity + (Math.random() - 0.5) * 0.11))
      a.rentalRevenue = Math.max(5, Math.min(80, a.rentalRevenue + (Math.random() - 0.42) * 0.13))
      a.grazingQuality = Math.max(5, Math.min(65, a.grazingQuality + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): AgisterArrangement[] { return this.arrangements }
}
