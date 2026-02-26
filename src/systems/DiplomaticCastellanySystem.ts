// Diplomatic Castellany System (v3.619) - Castellany governance
// Castle governors managing defense and administration between territories

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type CastellanyForm = 'defensive_castellany' | 'administrative_castellany' | 'judicial_castellany' | 'revenue_castellany'

export interface CastellanyArrangement {
  id: number
  territoryCivId: number
  castellanCivId: number
  form: CastellanyForm
  defenseStrength: number
  adminEfficiency: number
  judicialReach: number
  revenueCollection: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2740
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: CastellanyForm[] = ['defensive_castellany', 'administrative_castellany', 'judicial_castellany', 'revenue_castellany']

export class DiplomaticCastellanySystem {
  private arrangements: CastellanyArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const territory = 1 + Math.floor(Math.random() * 8)
      const castellan = 1 + Math.floor(Math.random() * 8)
      if (territory === castellan) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        territoryCivId: territory,
        castellanCivId: castellan,
        form,
        defenseStrength: 20 + Math.random() * 40,
        adminEfficiency: 25 + Math.random() * 35,
        judicialReach: 10 + Math.random() * 30,
        revenueCollection: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.defenseStrength = Math.max(5, Math.min(85, a.defenseStrength + (Math.random() - 0.48) * 0.12))
      a.adminEfficiency = Math.max(10, Math.min(90, a.adminEfficiency + (Math.random() - 0.5) * 0.11))
      a.judicialReach = Math.max(5, Math.min(80, a.judicialReach + (Math.random() - 0.42) * 0.13))
      a.revenueCollection = Math.max(5, Math.min(65, a.revenueCollection + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): CastellanyArrangement[] { return this.arrangements }
}
