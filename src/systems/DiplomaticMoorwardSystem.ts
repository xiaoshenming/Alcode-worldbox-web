// Diplomatic Moorward System (v3.741) - Moorward wasteland governance
// Officers managing moorland and wasteland boundaries between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MoorwardForm = 'royal_moorward' | 'manor_moorward' | 'parish_moorward' | 'common_moorward'

export interface MoorwardArrangement {
  id: number
  moorlandCivId: number
  neighborCivId: number
  form: MoorwardForm
  moorAuthority: number
  wastelandOversight: number
  heathEnforcement: number
  bogProtection: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3170
const PROCEED_CHANCE = 0.0025
const MAX_ARRANGEMENTS = 16

const FORMS: MoorwardForm[] = ['royal_moorward', 'manor_moorward', 'parish_moorward', 'common_moorward']

export class DiplomaticMoorwardSystem {
  private arrangements: MoorwardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const moorland = 1 + Math.floor(Math.random() * 8)
      const neighbor = 1 + Math.floor(Math.random() * 8)
      if (moorland === neighbor) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        moorlandCivId: moorland,
        neighborCivId: neighbor,
        form,
        moorAuthority: 20 + Math.random() * 40,
        wastelandOversight: 25 + Math.random() * 35,
        heathEnforcement: 10 + Math.random() * 30,
        bogProtection: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.moorAuthority = Math.max(5, Math.min(85, a.moorAuthority + (Math.random() - 0.48) * 0.12))
      a.wastelandOversight = Math.max(10, Math.min(90, a.wastelandOversight + (Math.random() - 0.5) * 0.11))
      a.heathEnforcement = Math.max(5, Math.min(80, a.heathEnforcement + (Math.random() - 0.42) * 0.13))
      a.bogProtection = Math.max(5, Math.min(65, a.bogProtection + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
