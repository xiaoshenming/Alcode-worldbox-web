// Diplomatic Hayward System (v3.737) - Hayward enclosure governance
// Officers managing hedge and fence maintenance between kingdom territories

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type HaywardForm = 'royal_hayward' | 'manor_hayward' | 'parish_hayward' | 'common_hayward'

export interface HaywardArrangement {
  id: number
  enclosingCivId: number
  neighborCivId: number
  form: HaywardForm
  enclosureAuthority: number
  hedgeMaintenance: number
  boundaryEnforcement: number
  commonProtection: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3110
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: HaywardForm[] = ['royal_hayward', 'manor_hayward', 'parish_hayward', 'common_hayward']

export class DiplomaticHaywardSystem {
  private arrangements: HaywardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const enclosing = 1 + Math.floor(Math.random() * 8)
      const neighbor = 1 + Math.floor(Math.random() * 8)
      if (enclosing === neighbor) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        enclosingCivId: enclosing,
        neighborCivId: neighbor,
        form,
        enclosureAuthority: 20 + Math.random() * 40,
        hedgeMaintenance: 25 + Math.random() * 35,
        boundaryEnforcement: 10 + Math.random() * 30,
        commonProtection: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.enclosureAuthority = Math.max(5, Math.min(85, a.enclosureAuthority + (Math.random() - 0.48) * 0.12))
      a.hedgeMaintenance = Math.max(10, Math.min(90, a.hedgeMaintenance + (Math.random() - 0.5) * 0.11))
      a.boundaryEnforcement = Math.max(5, Math.min(80, a.boundaryEnforcement + (Math.random() - 0.42) * 0.13))
      a.commonProtection = Math.max(5, Math.min(65, a.commonProtection + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
