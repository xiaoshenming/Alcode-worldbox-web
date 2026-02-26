// Diplomatic Woodreve System (v3.664) - Woodreve governance
// Officers managing woodland revenues and timber rights between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type WoodreveForm = 'royal_woodreve' | 'manor_woodreve' | 'shire_woodreve' | 'forest_woodreve'

export interface WoodreveArrangement {
  id: number
  woodlandCivId: number
  revenueCivId: number
  form: WoodreveForm
  timberJurisdiction: number
  revenueCollection: number
  woodlandSurvey: number
  harvestScheduling: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2850
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: WoodreveForm[] = ['royal_woodreve', 'manor_woodreve', 'shire_woodreve', 'forest_woodreve']

export class DiplomaticWoodreveSystem {
  private arrangements: WoodreveArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const woodland = 1 + Math.floor(Math.random() * 8)
      const revenue = 1 + Math.floor(Math.random() * 8)
      if (woodland === revenue) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        woodlandCivId: woodland,
        revenueCivId: revenue,
        form,
        timberJurisdiction: 20 + Math.random() * 40,
        revenueCollection: 25 + Math.random() * 35,
        woodlandSurvey: 10 + Math.random() * 30,
        harvestScheduling: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.timberJurisdiction = Math.max(5, Math.min(85, a.timberJurisdiction + (Math.random() - 0.48) * 0.12))
      a.revenueCollection = Math.max(10, Math.min(90, a.revenueCollection + (Math.random() - 0.5) * 0.11))
      a.woodlandSurvey = Math.max(5, Math.min(80, a.woodlandSurvey + (Math.random() - 0.42) * 0.13))
      a.harvestScheduling = Math.max(5, Math.min(65, a.harvestScheduling + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): WoodreveArrangement[] { return this.arrangements }
}
