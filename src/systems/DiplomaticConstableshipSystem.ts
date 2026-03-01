// Diplomatic Constableship System (v3.583) - Constable governance
// High constables maintaining order and commanding garrisons between realms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ConstableshipForm = 'lord_constableship' | 'castle_constableship' | 'high_constableship' | 'petty_constableship'

export interface ConstableshipArrangement {
  id: number
  crownCivId: number
  constableCivId: number
  form: ConstableshipForm
  garrisonCommand: number
  peacekeeping: number
  fortressControl: number
  militaryJustice: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2660
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: ConstableshipForm[] = ['lord_constableship', 'castle_constableship', 'high_constableship', 'petty_constableship']

export class DiplomaticConstableshipSystem {
  private arrangements: ConstableshipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const crown = 1 + Math.floor(Math.random() * 8)
      const constable = 1 + Math.floor(Math.random() * 8)
      if (crown === constable) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        crownCivId: crown,
        constableCivId: constable,
        form,
        garrisonCommand: 20 + Math.random() * 40,
        peacekeeping: 25 + Math.random() * 35,
        fortressControl: 10 + Math.random() * 30,
        militaryJustice: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.garrisonCommand = Math.max(5, Math.min(85, a.garrisonCommand + (Math.random() - 0.48) * 0.12))
      a.peacekeeping = Math.max(10, Math.min(90, a.peacekeeping + (Math.random() - 0.5) * 0.11))
      a.fortressControl = Math.max(5, Math.min(80, a.fortressControl + (Math.random() - 0.42) * 0.13))
      a.militaryJustice = Math.max(5, Math.min(65, a.militaryJustice + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
