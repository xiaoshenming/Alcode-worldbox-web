// Diplomatic Patronage System (v3.547) - Patronage relationships
// Powerful civilizations extending patronage to client states

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type PatronageForm = 'economic_patronage' | 'military_patronage' | 'cultural_patronage' | 'political_patronage'

export interface PatronageArrangement {
  id: number
  patronCivId: number
  clientCivId: number
  form: PatronageForm
  supportLevel: number
  loyaltyBond: number
  influenceGain: number
  reciprocalDuty: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2580
const PROCEED_CHANCE = 0.0020
const MAX_ARRANGEMENTS = 16

const FORMS: PatronageForm[] = ['economic_patronage', 'military_patronage', 'cultural_patronage', 'political_patronage']

export class DiplomaticPatronageSystem {
  private arrangements: PatronageArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const patron = 1 + Math.floor(Math.random() * 8)
      const client = 1 + Math.floor(Math.random() * 8)
      if (patron === client) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        patronCivId: patron,
        clientCivId: client,
        form,
        supportLevel: 20 + Math.random() * 40,
        loyaltyBond: 25 + Math.random() * 35,
        influenceGain: 10 + Math.random() * 30,
        reciprocalDuty: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.supportLevel = Math.max(5, Math.min(85, a.supportLevel + (Math.random() - 0.48) * 0.12))
      a.loyaltyBond = Math.max(10, Math.min(90, a.loyaltyBond + (Math.random() - 0.5) * 0.11))
      a.influenceGain = Math.max(5, Math.min(80, a.influenceGain + (Math.random() - 0.42) * 0.13))
      a.reciprocalDuty = Math.max(5, Math.min(65, a.reciprocalDuty + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): PatronageArrangement[] { return this.arrangements }
}
