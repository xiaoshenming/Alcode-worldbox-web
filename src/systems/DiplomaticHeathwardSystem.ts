// Diplomatic Heathward System (v3.743) - Heathward heathland governance
// Officers overseeing grazing rights and conservation on heathland commons between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type HeathwardForm = 'royal_heathward' | 'manor_heathward' | 'parish_heathward' | 'common_heathward'

export interface HeathwardArrangement {
  id: number
  grazingCivId: number
  neighborCivId: number
  form: HeathwardForm
  grazingAuthority: number
  heathConservation: number
  commonRights: number
  fireManagement: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3198
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: HeathwardForm[] = ['royal_heathward', 'manor_heathward', 'parish_heathward', 'common_heathward']

export class DiplomaticHeathwardSystem {
  private arrangements: HeathwardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const grazing = 1 + Math.floor(Math.random() * 8)
      const neighbor = 1 + Math.floor(Math.random() * 8)
      if (grazing === neighbor) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        grazingCivId: grazing,
        neighborCivId: neighbor,
        form,
        grazingAuthority: 20 + Math.random() * 40,
        heathConservation: 25 + Math.random() * 35,
        commonRights: 10 + Math.random() * 30,
        fireManagement: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.grazingAuthority = Math.max(5, Math.min(85, a.grazingAuthority + (Math.random() - 0.48) * 0.12))
      a.heathConservation = Math.max(10, Math.min(90, a.heathConservation + (Math.random() - 0.5) * 0.11))
      a.commonRights = Math.max(5, Math.min(80, a.commonRights + (Math.random() - 0.42) * 0.13))
      a.fireManagement = Math.max(5, Math.min(65, a.fireManagement + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
