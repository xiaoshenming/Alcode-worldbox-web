// Diplomatic Fenward System (v3.742) - Fenward marshland governance
// Officers managing drainage and land use in fenland territories between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type FenwardForm = 'royal_fenward' | 'manor_fenward' | 'parish_fenward' | 'common_fenward'

export interface FenwardArrangement {
  id: number
  drainingCivId: number
  neighborCivId: number
  form: FenwardForm
  drainageAuthority: number
  landReclamation: number
  waterManagement: number
  peatProtection: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3185
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: FenwardForm[] = ['royal_fenward', 'manor_fenward', 'parish_fenward', 'common_fenward']

export class DiplomaticFenwardSystem {
  private arrangements: FenwardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const draining = 1 + Math.floor(Math.random() * 8)
      const neighbor = 1 + Math.floor(Math.random() * 8)
      if (draining === neighbor) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        drainingCivId: draining,
        neighborCivId: neighbor,
        form,
        drainageAuthority: 20 + Math.random() * 40,
        landReclamation: 25 + Math.random() * 35,
        waterManagement: 10 + Math.random() * 30,
        peatProtection: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.drainageAuthority = Math.max(5, Math.min(85, a.drainageAuthority + (Math.random() - 0.48) * 0.12))
      a.landReclamation = Math.max(10, Math.min(90, a.landReclamation + (Math.random() - 0.5) * 0.11))
      a.waterManagement = Math.max(5, Math.min(80, a.waterManagement + (Math.random() - 0.42) * 0.13))
      a.peatProtection = Math.max(5, Math.min(65, a.peatProtection + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
