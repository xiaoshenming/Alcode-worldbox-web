// Diplomatic Reeveship System (v3.595) - Reeve governance
// Reeves managing local administration and agricultural oversight between territories

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ReeveshipForm = 'shire_reeveship' | 'port_reeveship' | 'manor_reeveship' | 'town_reeveship'

export interface ReeveshipArrangement {
  id: number
  lordCivId: number
  reeveCivId: number
  form: ReeveshipForm
  localAdministration: number
  agriculturalOversight: number
  laborManagement: number
  rentCollection: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2700
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: ReeveshipForm[] = ['shire_reeveship', 'port_reeveship', 'manor_reeveship', 'town_reeveship']

export class DiplomaticReeveshipSystem {
  private arrangements: ReeveshipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const lord = 1 + Math.floor(Math.random() * 8)
      const reeve = 1 + Math.floor(Math.random() * 8)
      if (lord === reeve) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        lordCivId: lord,
        reeveCivId: reeve,
        form,
        localAdministration: 20 + Math.random() * 40,
        agriculturalOversight: 25 + Math.random() * 35,
        laborManagement: 10 + Math.random() * 30,
        rentCollection: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.localAdministration = Math.max(5, Math.min(85, a.localAdministration + (Math.random() - 0.48) * 0.12))
      a.agriculturalOversight = Math.max(10, Math.min(90, a.agriculturalOversight + (Math.random() - 0.5) * 0.11))
      a.laborManagement = Math.max(5, Math.min(80, a.laborManagement + (Math.random() - 0.42) * 0.13))
      a.rentCollection = Math.max(5, Math.min(65, a.rentCollection + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): ReeveshipArrangement[] { return this.arrangements }
}
