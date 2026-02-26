// Diplomatic Bailiffship System (v3.574) - Bailiff governance
// Appointed bailiffs enforcing law and collecting dues between territories

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type BailiffshipForm = 'crown_bailiffship' | 'manorial_bailiffship' | 'hundred_bailiffship' | 'shire_bailiffship'

export interface BailiffshipArrangement {
  id: number
  appointerCivId: number
  bailiffCivId: number
  form: BailiffshipForm
  lawEnforcement: number
  dueCollection: number
  courtAdministration: number
  territorialControl: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2630
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: BailiffshipForm[] = ['crown_bailiffship', 'manorial_bailiffship', 'hundred_bailiffship', 'shire_bailiffship']

export class DiplomaticBailiffshipSystem {
  private arrangements: BailiffshipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const appointer = 1 + Math.floor(Math.random() * 8)
      const bailiff = 1 + Math.floor(Math.random() * 8)
      if (appointer === bailiff) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        appointerCivId: appointer,
        bailiffCivId: bailiff,
        form,
        lawEnforcement: 20 + Math.random() * 40,
        dueCollection: 25 + Math.random() * 35,
        courtAdministration: 10 + Math.random() * 30,
        territorialControl: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.lawEnforcement = Math.max(5, Math.min(85, a.lawEnforcement + (Math.random() - 0.48) * 0.12))
      a.dueCollection = Math.max(10, Math.min(90, a.dueCollection + (Math.random() - 0.5) * 0.11))
      a.courtAdministration = Math.max(5, Math.min(80, a.courtAdministration + (Math.random() - 0.42) * 0.13))
      a.territorialControl = Math.max(5, Math.min(65, a.territorialControl + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): BailiffshipArrangement[] { return this.arrangements }
}
