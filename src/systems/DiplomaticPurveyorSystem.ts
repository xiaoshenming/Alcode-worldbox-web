// Diplomatic Purveyor System (v3.637) - Purveyor governance
// Royal purveyors procuring supplies and provisions for the crown between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type PurveyorForm = 'royal_purveyor' | 'military_purveyor' | 'naval_purveyor' | 'household_purveyor'

export interface PurveyorArrangement {
  id: number
  crownCivId: number
  purveyorCivId: number
  form: PurveyorForm
  procurementReach: number
  supplyEfficiency: number
  priceNegotiation: number
  logisticsControl: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2800
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: PurveyorForm[] = ['royal_purveyor', 'military_purveyor', 'naval_purveyor', 'household_purveyor']

export class DiplomaticPurveyorSystem {
  private arrangements: PurveyorArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const crown = 1 + Math.floor(Math.random() * 8)
      const purveyor = 1 + Math.floor(Math.random() * 8)
      if (crown === purveyor) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        crownCivId: crown,
        purveyorCivId: purveyor,
        form,
        procurementReach: 20 + Math.random() * 40,
        supplyEfficiency: 25 + Math.random() * 35,
        priceNegotiation: 10 + Math.random() * 30,
        logisticsControl: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.procurementReach = Math.max(5, Math.min(85, a.procurementReach + (Math.random() - 0.48) * 0.12))
      a.supplyEfficiency = Math.max(10, Math.min(90, a.supplyEfficiency + (Math.random() - 0.5) * 0.11))
      a.priceNegotiation = Math.max(5, Math.min(80, a.priceNegotiation + (Math.random() - 0.42) * 0.13))
      a.logisticsControl = Math.max(5, Math.min(65, a.logisticsControl + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): PurveyorArrangement[] { return this.arrangements }
}
