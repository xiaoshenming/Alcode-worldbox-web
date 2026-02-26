// Diplomatic Marshward System (v3.746) - Marshward wetland governance
// Officers managing reed harvesting and waterfowl rights in marshland territories between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MarshwardForm = 'royal_marshward' | 'manor_marshward' | 'parish_marshward' | 'common_marshward'

export interface MarshwardArrangement {
  id: number
  marshCivId: number
  neighborCivId: number
  form: MarshwardForm
  reedAuthority: number
  waterfowlRights: number
  floodManagement: number
  peatExtraction: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3235
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: MarshwardForm[] = ['royal_marshward', 'manor_marshward', 'parish_marshward', 'common_marshward']

export class DiplomaticMarshwardSystem {
  private arrangements: MarshwardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const marsh = 1 + Math.floor(Math.random() * 8)
      const neighbor = 1 + Math.floor(Math.random() * 8)
      if (marsh === neighbor) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        marshCivId: marsh,
        neighborCivId: neighbor,
        form,
        reedAuthority: 20 + Math.random() * 40,
        waterfowlRights: 25 + Math.random() * 35,
        floodManagement: 10 + Math.random() * 30,
        peatExtraction: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.reedAuthority = Math.max(5, Math.min(85, a.reedAuthority + (Math.random() - 0.48) * 0.12))
      a.waterfowlRights = Math.max(10, Math.min(90, a.waterfowlRights + (Math.random() - 0.5) * 0.11))
      a.floodManagement = Math.max(5, Math.min(80, a.floodManagement + (Math.random() - 0.42) * 0.13))
      a.peatExtraction = Math.max(5, Math.min(65, a.peatExtraction + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): MarshwardArrangement[] { return this.arrangements }
}
