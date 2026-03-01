// Diplomatic Pinder System (v3.685) - Pinder governance
// Officers managing stray livestock pounds and animal impoundment between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type PinderForm = 'royal_pinder' | 'manor_pinder' | 'village_pinder' | 'common_pinder'

export interface PinderArrangement {
  id: number
  poundCivId: number
  livestockCivId: number
  form: PinderForm
  poundJurisdiction: number
  impoundmentRights: number
  fineCollection: number
  animalWelfare: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2920
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: PinderForm[] = ['royal_pinder', 'manor_pinder', 'village_pinder', 'common_pinder']

export class DiplomaticPinderSystem {
  private arrangements: PinderArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const pound = 1 + Math.floor(Math.random() * 8)
      const livestock = 1 + Math.floor(Math.random() * 8)
      if (pound === livestock) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        poundCivId: pound,
        livestockCivId: livestock,
        form,
        poundJurisdiction: 20 + Math.random() * 40,
        impoundmentRights: 25 + Math.random() * 35,
        fineCollection: 10 + Math.random() * 30,
        animalWelfare: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.poundJurisdiction = Math.max(5, Math.min(85, a.poundJurisdiction + (Math.random() - 0.48) * 0.12))
      a.impoundmentRights = Math.max(10, Math.min(90, a.impoundmentRights + (Math.random() - 0.5) * 0.11))
      a.fineCollection = Math.max(5, Math.min(80, a.fineCollection + (Math.random() - 0.42) * 0.13))
      a.animalWelfare = Math.max(5, Math.min(65, a.animalWelfare + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
