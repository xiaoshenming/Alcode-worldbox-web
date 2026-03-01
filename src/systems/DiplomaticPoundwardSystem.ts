// Diplomatic Poundward System (v3.739) - Poundward livestock governance
// Officers managing animal pounds and stray livestock between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type PoundwardForm = 'royal_poundward' | 'manor_poundward' | 'parish_poundward' | 'common_poundward'

export interface PoundwardArrangement {
  id: number
  impoundingCivId: number
  neighborCivId: number
  form: PoundwardForm
  poundAuthority: number
  livestockOversight: number
  strayEnforcement: number
  pasturalProtection: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3140
const PROCEED_CHANCE = 0.0023
const MAX_ARRANGEMENTS = 16

const FORMS: PoundwardForm[] = ['royal_poundward', 'manor_poundward', 'parish_poundward', 'common_poundward']

export class DiplomaticPoundwardSystem {
  private arrangements: PoundwardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const impounding = 1 + Math.floor(Math.random() * 8)
      const neighbor = 1 + Math.floor(Math.random() * 8)
      if (impounding === neighbor) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        impoundingCivId: impounding,
        neighborCivId: neighbor,
        form,
        poundAuthority: 20 + Math.random() * 40,
        livestockOversight: 25 + Math.random() * 35,
        strayEnforcement: 10 + Math.random() * 30,
        pasturalProtection: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.poundAuthority = Math.max(5, Math.min(85, a.poundAuthority + (Math.random() - 0.48) * 0.12))
      a.livestockOversight = Math.max(10, Math.min(90, a.livestockOversight + (Math.random() - 0.5) * 0.11))
      a.strayEnforcement = Math.max(5, Math.min(80, a.strayEnforcement + (Math.random() - 0.42) * 0.13))
      a.pasturalProtection = Math.max(5, Math.min(65, a.pasturalProtection + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
