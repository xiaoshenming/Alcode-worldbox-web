// Diplomatic Garthman System (v3.703) - Garthman governance
// Officers managing enclosed yards and garden plots between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type GarthmanForm = 'royal_garthman' | 'manor_garthman' | 'abbey_garthman' | 'borough_garthman'

export interface GarthmanArrangement {
  id: number
  gardenCivId: number
  yardCivId: number
  form: GarthmanForm
  gardenJurisdiction: number
  yardAllocation: number
  cultivationRights: number
  enclosureMaintenance: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2980
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: GarthmanForm[] = ['royal_garthman', 'manor_garthman', 'abbey_garthman', 'borough_garthman']

export class DiplomaticGarthmanSystem {
  private arrangements: GarthmanArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const garden = 1 + Math.floor(Math.random() * 8)
      const yard = 1 + Math.floor(Math.random() * 8)
      if (garden === yard) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        gardenCivId: garden,
        yardCivId: yard,
        form,
        gardenJurisdiction: 20 + Math.random() * 40,
        yardAllocation: 25 + Math.random() * 35,
        cultivationRights: 10 + Math.random() * 30,
        enclosureMaintenance: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.gardenJurisdiction = Math.max(5, Math.min(85, a.gardenJurisdiction + (Math.random() - 0.48) * 0.12))
      a.yardAllocation = Math.max(10, Math.min(90, a.yardAllocation + (Math.random() - 0.5) * 0.11))
      a.cultivationRights = Math.max(5, Math.min(80, a.cultivationRights + (Math.random() - 0.42) * 0.13))
      a.enclosureMaintenance = Math.max(5, Math.min(65, a.enclosureMaintenance + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): GarthmanArrangement[] { return this.arrangements }
}
