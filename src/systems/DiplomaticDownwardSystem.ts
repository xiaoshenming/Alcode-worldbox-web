// Diplomatic Downward System (v3.744) - Downward hillside governance
// Officers managing terraced land use and water runoff on hillside territories between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type DownwardForm = 'royal_downward' | 'manor_downward' | 'parish_downward' | 'common_downward'

export interface DownwardArrangement {
  id: number
  hillsideCivId: number
  neighborCivId: number
  form: DownwardForm
  terraceAuthority: number
  slopeManagement: number
  runoffControl: number
  erosionPrevention: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3210
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: DownwardForm[] = ['royal_downward', 'manor_downward', 'parish_downward', 'common_downward']

export class DiplomaticDownwardSystem {
  private arrangements: DownwardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const hillside = 1 + Math.floor(Math.random() * 8)
      const neighbor = 1 + Math.floor(Math.random() * 8)
      if (hillside === neighbor) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        hillsideCivId: hillside,
        neighborCivId: neighbor,
        form,
        terraceAuthority: 20 + Math.random() * 40,
        slopeManagement: 25 + Math.random() * 35,
        runoffControl: 10 + Math.random() * 30,
        erosionPrevention: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.terraceAuthority = Math.max(5, Math.min(85, a.terraceAuthority + (Math.random() - 0.48) * 0.12))
      a.slopeManagement = Math.max(10, Math.min(90, a.slopeManagement + (Math.random() - 0.5) * 0.11))
      a.runoffControl = Math.max(5, Math.min(80, a.runoffControl + (Math.random() - 0.42) * 0.13))
      a.erosionPrevention = Math.max(5, Math.min(65, a.erosionPrevention + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): DownwardArrangement[] { return this.arrangements }
}
