// Diplomatic Lampwarden System (v3.715) - Lampwarden governance
// Officers maintaining public lighting and night watch between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type LampwardenForm = 'royal_lampwarden' | 'borough_lampwarden' | 'guild_lampwarden' | 'parish_lampwarden'

export interface LampwardenArrangement {
  id: number
  lightingCivId: number
  watchCivId: number
  form: LampwardenForm
  lightingAuthority: number
  nightWatch: number
  oilAllocation: number
  safetyPatrol: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3020
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: LampwardenForm[] = ['royal_lampwarden', 'borough_lampwarden', 'guild_lampwarden', 'parish_lampwarden']

export class DiplomaticLampwardenSystem {
  private arrangements: LampwardenArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const lighting = 1 + Math.floor(Math.random() * 8)
      const watch = 1 + Math.floor(Math.random() * 8)
      if (lighting === watch) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        lightingCivId: lighting,
        watchCivId: watch,
        form,
        lightingAuthority: 20 + Math.random() * 40,
        nightWatch: 25 + Math.random() * 35,
        oilAllocation: 10 + Math.random() * 30,
        safetyPatrol: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.lightingAuthority = Math.max(5, Math.min(85, a.lightingAuthority + (Math.random() - 0.48) * 0.12))
      a.nightWatch = Math.max(10, Math.min(90, a.nightWatch + (Math.random() - 0.5) * 0.11))
      a.oilAllocation = Math.max(5, Math.min(80, a.oilAllocation + (Math.random() - 0.42) * 0.13))
      a.safetyPatrol = Math.max(5, Math.min(65, a.safetyPatrol + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
