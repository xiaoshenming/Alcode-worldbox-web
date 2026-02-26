// Diplomatic Woodward System (v3.738) - Woodward forest governance
// Officers overseeing woodland management and timber rights between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type WoodwardForm = 'royal_woodward' | 'manor_woodward' | 'parish_woodward' | 'common_woodward'

export interface WoodwardArrangement {
  id: number
  forestCivId: number
  neighborCivId: number
  form: WoodwardForm
  forestAuthority: number
  timberOversight: number
  woodlandEnforcement: number
  canopyProtection: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3125
const PROCEED_CHANCE = 0.0022
const MAX_ARRANGEMENTS = 16

const FORMS: WoodwardForm[] = ['royal_woodward', 'manor_woodward', 'parish_woodward', 'common_woodward']

export class DiplomaticWoodwardSystem {
  private arrangements: WoodwardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const forest = 1 + Math.floor(Math.random() * 8)
      const neighbor = 1 + Math.floor(Math.random() * 8)
      if (forest === neighbor) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        forestCivId: forest,
        neighborCivId: neighbor,
        form,
        forestAuthority: 20 + Math.random() * 40,
        timberOversight: 25 + Math.random() * 35,
        woodlandEnforcement: 10 + Math.random() * 30,
        canopyProtection: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.forestAuthority = Math.max(5, Math.min(85, a.forestAuthority + (Math.random() - 0.48) * 0.12))
      a.timberOversight = Math.max(10, Math.min(90, a.timberOversight + (Math.random() - 0.5) * 0.11))
      a.woodlandEnforcement = Math.max(5, Math.min(80, a.woodlandEnforcement + (Math.random() - 0.42) * 0.13))
      a.canopyProtection = Math.max(5, Math.min(65, a.canopyProtection + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): WoodwardArrangement[] { return this.arrangements }
}
