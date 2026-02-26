// Diplomatic Hayward System (v3.646) - Hayward governance
// Hedge and fence wardens managing common land boundaries between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type HaywardForm = 'common_hayward' | 'manor_hayward' | 'parish_hayward' | 'borough_hayward'

export interface HaywardArrangement {
  id: number
  commonCivId: number
  haywardCivId: number
  form: HaywardForm
  boundaryEnforcement: number
  fenceInspection: number
  strayRecovery: number
  commonRights: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2830
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: HaywardForm[] = ['common_hayward', 'manor_hayward', 'parish_hayward', 'borough_hayward']

export class DiplomaticHaywardSystem {
  private arrangements: HaywardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const common = 1 + Math.floor(Math.random() * 8)
      const hayward = 1 + Math.floor(Math.random() * 8)
      if (common === hayward) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        commonCivId: common,
        haywardCivId: hayward,
        form,
        boundaryEnforcement: 20 + Math.random() * 40,
        fenceInspection: 25 + Math.random() * 35,
        strayRecovery: 10 + Math.random() * 30,
        commonRights: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.boundaryEnforcement = Math.max(5, Math.min(85, a.boundaryEnforcement + (Math.random() - 0.48) * 0.12))
      a.fenceInspection = Math.max(10, Math.min(90, a.fenceInspection + (Math.random() - 0.5) * 0.11))
      a.strayRecovery = Math.max(5, Math.min(80, a.strayRecovery + (Math.random() - 0.42) * 0.13))
      a.commonRights = Math.max(5, Math.min(65, a.commonRights + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): HaywardArrangement[] { return this.arrangements }
}
