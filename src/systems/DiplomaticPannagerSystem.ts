// Diplomatic Pannager System (v3.649) - Pannage governance
// Officers managing forest grazing rights and mast feeding between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type PannagerForm = 'forest_pannage' | 'royal_pannage' | 'common_pannage' | 'seasonal_pannage'

export interface PannagerArrangement {
  id: number
  forestCivId: number
  pannagerCivId: number
  form: PannagerForm
  grazingRights: number
  mastAllocation: number
  seasonalControl: number
  livestockManagement: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2840
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: PannagerForm[] = ['forest_pannage', 'royal_pannage', 'common_pannage', 'seasonal_pannage']

export class DiplomaticPannagerSystem {
  private arrangements: PannagerArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const forest = 1 + Math.floor(Math.random() * 8)
      const pannager = 1 + Math.floor(Math.random() * 8)
      if (forest === pannager) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        forestCivId: forest,
        pannagerCivId: pannager,
        form,
        grazingRights: 20 + Math.random() * 40,
        mastAllocation: 25 + Math.random() * 35,
        seasonalControl: 10 + Math.random() * 30,
        livestockManagement: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.grazingRights = Math.max(5, Math.min(85, a.grazingRights + (Math.random() - 0.48) * 0.12))
      a.mastAllocation = Math.max(10, Math.min(90, a.mastAllocation + (Math.random() - 0.5) * 0.11))
      a.seasonalControl = Math.max(5, Math.min(80, a.seasonalControl + (Math.random() - 0.42) * 0.13))
      a.livestockManagement = Math.max(5, Math.min(65, a.livestockManagement + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
