// Diplomatic Fieldward System (v3.740) - Fieldward agricultural governance
// Officers managing crop field boundaries and agricultural rights between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type FieldwardForm = 'royal_fieldward' | 'manor_fieldward' | 'parish_fieldward' | 'common_fieldward'

export interface FieldwardArrangement {
  id: number
  farmingCivId: number
  neighborCivId: number
  form: FieldwardForm
  fieldAuthority: number
  cropOversight: number
  boundaryEnforcement: number
  harvestProtection: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3155
const PROCEED_CHANCE = 0.0024
const MAX_ARRANGEMENTS = 16

const FORMS: FieldwardForm[] = ['royal_fieldward', 'manor_fieldward', 'parish_fieldward', 'common_fieldward']

export class DiplomaticFieldwardSystem {
  private arrangements: FieldwardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const farming = 1 + Math.floor(Math.random() * 8)
      const neighbor = 1 + Math.floor(Math.random() * 8)
      if (farming === neighbor) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        farmingCivId: farming,
        neighborCivId: neighbor,
        form,
        fieldAuthority: 20 + Math.random() * 40,
        cropOversight: 25 + Math.random() * 35,
        boundaryEnforcement: 10 + Math.random() * 30,
        harvestProtection: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.fieldAuthority = Math.max(5, Math.min(85, a.fieldAuthority + (Math.random() - 0.48) * 0.12))
      a.cropOversight = Math.max(10, Math.min(90, a.cropOversight + (Math.random() - 0.5) * 0.11))
      a.boundaryEnforcement = Math.max(5, Math.min(80, a.boundaryEnforcement + (Math.random() - 0.42) * 0.13))
      a.harvestProtection = Math.max(5, Math.min(65, a.harvestProtection + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
