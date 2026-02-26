// Diplomatic Breadweigher System (v3.697) - Breadweigher governance
// Officers inspecting bread weight and quality standards between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type BreadweigherForm = 'royal_breadweigher' | 'borough_breadweigher' | 'guild_breadweigher' | 'market_breadweigher'

export interface BreadweigherArrangement {
  id: number
  bakingCivId: number
  inspectionCivId: number
  form: BreadweigherForm
  weightStandards: number
  qualityInspection: number
  priceAssize: number
  flourRegulation: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2960
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: BreadweigherForm[] = ['royal_breadweigher', 'borough_breadweigher', 'guild_breadweigher', 'market_breadweigher']

export class DiplomaticBreadweigherSystem {
  private arrangements: BreadweigherArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const baking = 1 + Math.floor(Math.random() * 8)
      const inspection = 1 + Math.floor(Math.random() * 8)
      if (baking === inspection) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        bakingCivId: baking,
        inspectionCivId: inspection,
        form,
        weightStandards: 20 + Math.random() * 40,
        qualityInspection: 25 + Math.random() * 35,
        priceAssize: 10 + Math.random() * 30,
        flourRegulation: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.weightStandards = Math.max(5, Math.min(85, a.weightStandards + (Math.random() - 0.48) * 0.12))
      a.qualityInspection = Math.max(10, Math.min(90, a.qualityInspection + (Math.random() - 0.5) * 0.11))
      a.priceAssize = Math.max(5, Math.min(80, a.priceAssize + (Math.random() - 0.42) * 0.13))
      a.flourRegulation = Math.max(5, Math.min(65, a.flourRegulation + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): BreadweigherArrangement[] { return this.arrangements }
}
