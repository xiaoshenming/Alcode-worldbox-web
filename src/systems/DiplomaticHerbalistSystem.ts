// Diplomatic Herbalist System (v3.712) - Herbalist governance
// Officers regulating herb gathering and medicinal plant trade between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type HerbalistForm = 'royal_herbalist' | 'abbey_herbalist' | 'guild_herbalist' | 'village_herbalist'

export interface HerbalistArrangement {
  id: number
  gatheringCivId: number
  tradeCivId: number
  form: HerbalistForm
  gatheringRights: number
  medicinalTrade: number
  herbLore: number
  gardenAccess: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3010
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: HerbalistForm[] = ['royal_herbalist', 'abbey_herbalist', 'guild_herbalist', 'village_herbalist']

export class DiplomaticHerbalistSystem {
  private arrangements: HerbalistArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const gathering = 1 + Math.floor(Math.random() * 8)
      const trade = 1 + Math.floor(Math.random() * 8)
      if (gathering === trade) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        gatheringCivId: gathering,
        tradeCivId: trade,
        form,
        gatheringRights: 20 + Math.random() * 40,
        medicinalTrade: 25 + Math.random() * 35,
        herbLore: 10 + Math.random() * 30,
        gardenAccess: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.gatheringRights = Math.max(5, Math.min(85, a.gatheringRights + (Math.random() - 0.48) * 0.12))
      a.medicinalTrade = Math.max(10, Math.min(90, a.medicinalTrade + (Math.random() - 0.5) * 0.11))
      a.herbLore = Math.max(5, Math.min(80, a.herbLore + (Math.random() - 0.42) * 0.13))
      a.gardenAccess = Math.max(5, Math.min(65, a.gardenAccess + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): HerbalistArrangement[] { return this.arrangements }
}
