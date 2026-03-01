// Diplomatic Coroner System (v3.628) - Coroner governance
// Crown officers investigating deaths and managing inquests between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type CoronerForm = 'royal_coroner' | 'county_coroner' | 'borough_coroner' | 'palatine_coroner'

export interface CoronerArrangement {
  id: number
  crownCivId: number
  coronerCivId: number
  form: CoronerForm
  inquestAuthority: number
  jurisdictionReach: number
  recordKeeping: number
  crownRevenue: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2770
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: CoronerForm[] = ['royal_coroner', 'county_coroner', 'borough_coroner', 'palatine_coroner']

export class DiplomaticCoronerSystem {
  private arrangements: CoronerArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const crown = 1 + Math.floor(Math.random() * 8)
      const coroner = 1 + Math.floor(Math.random() * 8)
      if (crown === coroner) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        crownCivId: crown,
        coronerCivId: coroner,
        form,
        inquestAuthority: 20 + Math.random() * 40,
        jurisdictionReach: 25 + Math.random() * 35,
        recordKeeping: 10 + Math.random() * 30,
        crownRevenue: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.inquestAuthority = Math.max(5, Math.min(85, a.inquestAuthority + (Math.random() - 0.48) * 0.12))
      a.jurisdictionReach = Math.max(10, Math.min(90, a.jurisdictionReach + (Math.random() - 0.5) * 0.11))
      a.recordKeeping = Math.max(5, Math.min(80, a.recordKeeping + (Math.random() - 0.42) * 0.13))
      a.crownRevenue = Math.max(5, Math.min(65, a.crownRevenue + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
