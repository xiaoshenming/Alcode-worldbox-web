// Diplomatic Stewardry System (v3.598) - Stewardry governance
// Royal stewards managing crown lands and household affairs between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type StewardryForm = 'royal_stewardry' | 'household_stewardry' | 'land_stewardry' | 'judicial_stewardry'

export interface StewardryArrangement {
  id: number
  crownCivId: number
  stewardCivId: number
  form: StewardryForm
  landManagement: number
  householdControl: number
  revenueOversight: number
  provisioning: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2710
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: StewardryForm[] = ['royal_stewardry', 'household_stewardry', 'land_stewardry', 'judicial_stewardry']

export class DiplomaticStewardrySystem {
  private arrangements: StewardryArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const crown = 1 + Math.floor(Math.random() * 8)
      const steward = 1 + Math.floor(Math.random() * 8)
      if (crown === steward) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        crownCivId: crown,
        stewardCivId: steward,
        form,
        landManagement: 20 + Math.random() * 40,
        householdControl: 25 + Math.random() * 35,
        revenueOversight: 10 + Math.random() * 30,
        provisioning: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.landManagement = Math.max(5, Math.min(85, a.landManagement + (Math.random() - 0.48) * 0.12))
      a.householdControl = Math.max(10, Math.min(90, a.householdControl + (Math.random() - 0.5) * 0.11))
      a.revenueOversight = Math.max(5, Math.min(80, a.revenueOversight + (Math.random() - 0.42) * 0.13))
      a.provisioning = Math.max(5, Math.min(65, a.provisioning + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
