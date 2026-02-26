// Diplomatic Tollbooth System (v3.730) - Tollbooth governance
// Officers managing toll collection at bridges, roads and gates between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type TollboothForm = 'royal_tollbooth' | 'bridge_tollbooth' | 'gate_tollbooth' | 'road_tollbooth'

export interface TollboothArrangement {
  id: number
  collectionCivId: number
  passageCivId: number
  form: TollboothForm
  tollAuthority: number
  revenueCollection: number
  passageRegulation: number
  maintenanceFund: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3070
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: TollboothForm[] = ['royal_tollbooth', 'bridge_tollbooth', 'gate_tollbooth', 'road_tollbooth']

export class DiplomaticTollboothSystem {
  private arrangements: TollboothArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const collection = 1 + Math.floor(Math.random() * 8)
      const passage = 1 + Math.floor(Math.random() * 8)
      if (collection === passage) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        collectionCivId: collection,
        passageCivId: passage,
        form,
        tollAuthority: 20 + Math.random() * 40,
        revenueCollection: 25 + Math.random() * 35,
        passageRegulation: 10 + Math.random() * 30,
        maintenanceFund: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.tollAuthority = Math.max(5, Math.min(85, a.tollAuthority + (Math.random() - 0.48) * 0.12))
      a.revenueCollection = Math.max(10, Math.min(90, a.revenueCollection + (Math.random() - 0.5) * 0.11))
      a.passageRegulation = Math.max(5, Math.min(80, a.passageRegulation + (Math.random() - 0.42) * 0.13))
      a.maintenanceFund = Math.max(5, Math.min(65, a.maintenanceFund + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): TollboothArrangement[] { return this.arrangements }
}
