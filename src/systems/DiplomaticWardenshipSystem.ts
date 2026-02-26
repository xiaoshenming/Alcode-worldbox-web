// Diplomatic Wardenship System (v3.589) - Warden governance
// Wardens guarding borders and managing marches between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type WardenshipForm = 'lord_wardenship' | 'march_wardenship' | 'forest_wardenship' | 'port_wardenship'

export interface WardenshipArrangement {
  id: number
  sovereignCivId: number
  wardenCivId: number
  form: WardenshipForm
  borderDefense: number
  marchPatrol: number
  resourceGuardianship: number
  passageControl: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2680
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: WardenshipForm[] = ['lord_wardenship', 'march_wardenship', 'forest_wardenship', 'port_wardenship']

export class DiplomaticWardenshipSystem {
  private arrangements: WardenshipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const sovereign = 1 + Math.floor(Math.random() * 8)
      const warden = 1 + Math.floor(Math.random() * 8)
      if (sovereign === warden) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        sovereignCivId: sovereign,
        wardenCivId: warden,
        form,
        borderDefense: 20 + Math.random() * 40,
        marchPatrol: 25 + Math.random() * 35,
        resourceGuardianship: 10 + Math.random() * 30,
        passageControl: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.borderDefense = Math.max(5, Math.min(85, a.borderDefense + (Math.random() - 0.48) * 0.12))
      a.marchPatrol = Math.max(10, Math.min(90, a.marchPatrol + (Math.random() - 0.5) * 0.11))
      a.resourceGuardianship = Math.max(5, Math.min(80, a.resourceGuardianship + (Math.random() - 0.42) * 0.13))
      a.passageControl = Math.max(5, Math.min(65, a.passageControl + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): WardenshipArrangement[] { return this.arrangements }
}
