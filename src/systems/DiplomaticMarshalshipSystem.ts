// Diplomatic Marshalship System (v3.580) - Marshal governance
// Military marshals coordinating defense and campaigns between allied realms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MarshalshipForm = 'field_marshalship' | 'grand_marshalship' | 'provost_marshalship' | 'earl_marshalship'

export interface MarshalshipArrangement {
  id: number
  commanderCivId: number
  marshalCivId: number
  form: MarshalshipForm
  militaryCommand: number
  campaignCoordination: number
  logisticsControl: number
  disciplineEnforcement: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2650
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: MarshalshipForm[] = ['field_marshalship', 'grand_marshalship', 'provost_marshalship', 'earl_marshalship']

export class DiplomaticMarshalshipSystem {
  private arrangements: MarshalshipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const commander = 1 + Math.floor(Math.random() * 8)
      const marshal = 1 + Math.floor(Math.random() * 8)
      if (commander === marshal) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        commanderCivId: commander,
        marshalCivId: marshal,
        form,
        militaryCommand: 20 + Math.random() * 40,
        campaignCoordination: 25 + Math.random() * 35,
        logisticsControl: 10 + Math.random() * 30,
        disciplineEnforcement: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.militaryCommand = Math.max(5, Math.min(85, a.militaryCommand + (Math.random() - 0.48) * 0.12))
      a.campaignCoordination = Math.max(10, Math.min(90, a.campaignCoordination + (Math.random() - 0.5) * 0.11))
      a.logisticsControl = Math.max(5, Math.min(80, a.logisticsControl + (Math.random() - 0.42) * 0.13))
      a.disciplineEnforcement = Math.max(5, Math.min(65, a.disciplineEnforcement + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): MarshalshipArrangement[] { return this.arrangements }
}
