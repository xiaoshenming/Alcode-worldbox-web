// Diplomatic Woldward System (v3.745) - Woldward open country governance
// Officers managing grazing and cultivation rights on open wold territories between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type WoldwardForm = 'royal_woldward' | 'manor_woldward' | 'parish_woldward' | 'common_woldward'

export interface WoldwardArrangement {
  id: number
  woldCivId: number
  neighborCivId: number
  form: WoldwardForm
  grazingAuthority: number
  cultivationRights: number
  boundaryPatrol: number
  sheepFoldManagement: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3222
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: WoldwardForm[] = ['royal_woldward', 'manor_woldward', 'parish_woldward', 'common_woldward']

export class DiplomaticWoldwardSystem {
  private arrangements: WoldwardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const wold = 1 + Math.floor(Math.random() * 8)
      const neighbor = 1 + Math.floor(Math.random() * 8)
      if (wold === neighbor) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        woldCivId: wold,
        neighborCivId: neighbor,
        form,
        grazingAuthority: 20 + Math.random() * 40,
        cultivationRights: 25 + Math.random() * 35,
        boundaryPatrol: 10 + Math.random() * 30,
        sheepFoldManagement: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.grazingAuthority = Math.max(5, Math.min(85, a.grazingAuthority + (Math.random() - 0.48) * 0.12))
      a.cultivationRights = Math.max(10, Math.min(90, a.cultivationRights + (Math.random() - 0.5) * 0.11))
      a.boundaryPatrol = Math.max(5, Math.min(80, a.boundaryPatrol + (Math.random() - 0.42) * 0.13))
      a.sheepFoldManagement = Math.max(5, Math.min(65, a.sheepFoldManagement + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
