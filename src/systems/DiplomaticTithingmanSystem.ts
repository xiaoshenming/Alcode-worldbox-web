// Diplomatic Tithingman System (v3.679) - Tithingman governance
// Officers managing tithing groups and collective responsibility between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type TithingmanForm = 'royal_tithingman' | 'hundred_tithingman' | 'parish_tithingman' | 'manor_tithingman'

export interface TithingmanArrangement {
  id: number
  tithingCivId: number
  oversightCivId: number
  form: TithingmanForm
  collectiveAuthority: number
  suretyBonds: number
  peacekeeping: number
  taxCollection: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2900
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: TithingmanForm[] = ['royal_tithingman', 'hundred_tithingman', 'parish_tithingman', 'manor_tithingman']

export class DiplomaticTithingmanSystem {
  private arrangements: TithingmanArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const tithing = 1 + Math.floor(Math.random() * 8)
      const oversight = 1 + Math.floor(Math.random() * 8)
      if (tithing === oversight) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        tithingCivId: tithing,
        oversightCivId: oversight,
        form,
        collectiveAuthority: 20 + Math.random() * 40,
        suretyBonds: 25 + Math.random() * 35,
        peacekeeping: 10 + Math.random() * 30,
        taxCollection: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.collectiveAuthority = Math.max(5, Math.min(85, a.collectiveAuthority + (Math.random() - 0.48) * 0.12))
      a.suretyBonds = Math.max(10, Math.min(90, a.suretyBonds + (Math.random() - 0.5) * 0.11))
      a.peacekeeping = Math.max(5, Math.min(80, a.peacekeeping + (Math.random() - 0.42) * 0.13))
      a.taxCollection = Math.max(5, Math.min(65, a.taxCollection + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): TithingmanArrangement[] { return this.arrangements }
}
