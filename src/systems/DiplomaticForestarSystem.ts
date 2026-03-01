// Diplomatic Forestar System (v3.670) - Forestar governance
// Officers managing afforestation and woodland expansion between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ForestarForm = 'royal_forestar' | 'crown_forestar' | 'shire_forestar' | 'manor_forestar'

export interface ForestarArrangement {
  id: number
  plantingCivId: number
  managementCivId: number
  form: ForestarForm
  afforestationScope: number
  seedlingSupply: number
  landAllocation: number
  growthMonitoring: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2870
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: ForestarForm[] = ['royal_forestar', 'crown_forestar', 'shire_forestar', 'manor_forestar']

export class DiplomaticForestarSystem {
  private arrangements: ForestarArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const planting = 1 + Math.floor(Math.random() * 8)
      const management = 1 + Math.floor(Math.random() * 8)
      if (planting === management) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        plantingCivId: planting,
        managementCivId: management,
        form,
        afforestationScope: 20 + Math.random() * 40,
        seedlingSupply: 25 + Math.random() * 35,
        landAllocation: 10 + Math.random() * 30,
        growthMonitoring: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.afforestationScope = Math.max(5, Math.min(85, a.afforestationScope + (Math.random() - 0.48) * 0.12))
      a.seedlingSupply = Math.max(10, Math.min(90, a.seedlingSupply + (Math.random() - 0.5) * 0.11))
      a.landAllocation = Math.max(5, Math.min(80, a.landAllocation + (Math.random() - 0.42) * 0.13))
      a.growthMonitoring = Math.max(5, Math.min(65, a.growthMonitoring + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
