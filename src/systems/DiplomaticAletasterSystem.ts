// Diplomatic Aletaster System (v3.694) - Aletaster governance
// Officers inspecting ale quality and enforcing brewing standards between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AletasterForm = 'royal_aletaster' | 'borough_aletaster' | 'guild_aletaster' | 'market_aletaster'

export interface AletasterArrangement {
  id: number
  brewingCivId: number
  inspectionCivId: number
  form: AletasterForm
  qualityStandards: number
  inspectionRigor: number
  priceRegulation: number
  measureEnforcement: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2950
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: AletasterForm[] = ['royal_aletaster', 'borough_aletaster', 'guild_aletaster', 'market_aletaster']

export class DiplomaticAletasterSystem {
  private arrangements: AletasterArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const brewing = 1 + Math.floor(Math.random() * 8)
      const inspection = 1 + Math.floor(Math.random() * 8)
      if (brewing === inspection) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        brewingCivId: brewing,
        inspectionCivId: inspection,
        form,
        qualityStandards: 20 + Math.random() * 40,
        inspectionRigor: 25 + Math.random() * 35,
        priceRegulation: 10 + Math.random() * 30,
        measureEnforcement: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.qualityStandards = Math.max(5, Math.min(85, a.qualityStandards + (Math.random() - 0.48) * 0.12))
      a.inspectionRigor = Math.max(10, Math.min(90, a.inspectionRigor + (Math.random() - 0.5) * 0.11))
      a.priceRegulation = Math.max(5, Math.min(80, a.priceRegulation + (Math.random() - 0.42) * 0.13))
      a.measureEnforcement = Math.max(5, Math.min(65, a.measureEnforcement + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
