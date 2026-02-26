// Diplomatic Chatelaincy System (v3.616) - Chatelaincy governance
// Castle wardens managing fortifications and household affairs between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ChatelaincyForm = 'fortress_chatelaincy' | 'household_chatelaincy' | 'garrison_chatelaincy' | 'provisioning_chatelaincy'

export interface ChatelaincyArrangement {
  id: number
  fortressCivId: number
  chatelainCivId: number
  form: ChatelaincyForm
  fortressControl: number
  householdOrder: number
  garrisonStrength: number
  supplyManagement: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2730
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: ChatelaincyForm[] = ['fortress_chatelaincy', 'household_chatelaincy', 'garrison_chatelaincy', 'provisioning_chatelaincy']

export class DiplomaticChatelaincySystem {
  private arrangements: ChatelaincyArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const fortress = 1 + Math.floor(Math.random() * 8)
      const chatelain = 1 + Math.floor(Math.random() * 8)
      if (fortress === chatelain) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        fortressCivId: fortress,
        chatelainCivId: chatelain,
        form,
        fortressControl: 20 + Math.random() * 40,
        householdOrder: 25 + Math.random() * 35,
        garrisonStrength: 10 + Math.random() * 30,
        supplyManagement: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.fortressControl = Math.max(5, Math.min(85, a.fortressControl + (Math.random() - 0.48) * 0.12))
      a.householdOrder = Math.max(10, Math.min(90, a.householdOrder + (Math.random() - 0.5) * 0.11))
      a.garrisonStrength = Math.max(5, Math.min(80, a.garrisonStrength + (Math.random() - 0.42) * 0.13))
      a.supplyManagement = Math.max(5, Math.min(65, a.supplyManagement + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): ChatelaincyArrangement[] { return this.arrangements }
}
