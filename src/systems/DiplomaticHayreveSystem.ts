// Diplomatic Hayreve System (v3.682) - Hayreve governance
// Officers managing hay meadows and fodder distribution between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type HayreveForm = 'royal_hayreve' | 'manor_hayreve' | 'common_hayreve' | 'demesne_hayreve'

export interface HayreveArrangement {
  id: number
  meadowCivId: number
  fodderCivId: number
  form: HayreveForm
  meadowJurisdiction: number
  hayAllocation: number
  harvestSchedule: number
  storageManagement: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2910
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: HayreveForm[] = ['royal_hayreve', 'manor_hayreve', 'common_hayreve', 'demesne_hayreve']

export class DiplomaticHayreveSystem {
  private arrangements: HayreveArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const meadow = 1 + Math.floor(Math.random() * 8)
      const fodder = 1 + Math.floor(Math.random() * 8)
      if (meadow === fodder) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        meadowCivId: meadow,
        fodderCivId: fodder,
        form,
        meadowJurisdiction: 20 + Math.random() * 40,
        hayAllocation: 25 + Math.random() * 35,
        harvestSchedule: 10 + Math.random() * 30,
        storageManagement: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.meadowJurisdiction = Math.max(5, Math.min(85, a.meadowJurisdiction + (Math.random() - 0.48) * 0.12))
      a.hayAllocation = Math.max(10, Math.min(90, a.hayAllocation + (Math.random() - 0.5) * 0.11))
      a.harvestSchedule = Math.max(5, Math.min(80, a.harvestSchedule + (Math.random() - 0.42) * 0.13))
      a.storageManagement = Math.max(5, Math.min(65, a.storageManagement + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
