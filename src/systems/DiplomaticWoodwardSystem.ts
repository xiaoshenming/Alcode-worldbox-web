// Diplomatic Woodward System (v3.655) - Woodward governance
// Forest wardens managing timber rights and woodland preservation between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type WoodwardForm = 'royal_woodward' | 'manor_woodward' | 'common_woodward' | 'chase_woodward'

export interface WoodwardArrangement {
  id: number
  woodlandCivId: number
  woodwardCivId: number
  form: WoodwardForm
  timberRights: number
  woodlandPreservation: number
  coppiceManagement: number
  charcoalProduction: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2860
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: WoodwardForm[] = ['royal_woodward', 'manor_woodward', 'common_woodward', 'chase_woodward']

export class DiplomaticWoodwardSystem {
  private arrangements: WoodwardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const woodland = 1 + Math.floor(Math.random() * 8)
      const woodward = 1 + Math.floor(Math.random() * 8)
      if (woodland === woodward) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        woodlandCivId: woodland,
        woodwardCivId: woodward,
        form,
        timberRights: 20 + Math.random() * 40,
        woodlandPreservation: 25 + Math.random() * 35,
        coppiceManagement: 10 + Math.random() * 30,
        charcoalProduction: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.timberRights = Math.max(5, Math.min(85, a.timberRights + (Math.random() - 0.48) * 0.12))
      a.woodlandPreservation = Math.max(10, Math.min(90, a.woodlandPreservation + (Math.random() - 0.5) * 0.11))
      a.coppiceManagement = Math.max(5, Math.min(80, a.coppiceManagement + (Math.random() - 0.42) * 0.13))
      a.charcoalProduction = Math.max(5, Math.min(65, a.charcoalProduction + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): WoodwardArrangement[] { return this.arrangements }
}
