// Diplomatic Clavigers System (v3.718) - Claviger governance
// Officers holding keys to city gates and managing access between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ClavigerForm = 'royal_claviger' | 'castle_claviger' | 'city_claviger' | 'abbey_claviger'

export interface ClavigerArrangement {
  id: number
  gateCivId: number
  accessCivId: number
  form: ClavigerForm
  gateAuthority: number
  accessControl: number
  keyHolding: number
  curfewEnforcement: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3030
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: ClavigerForm[] = ['royal_claviger', 'castle_claviger', 'city_claviger', 'abbey_claviger']

export class DiplomaticClavigersSystem {
  private arrangements: ClavigerArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const gate = 1 + Math.floor(Math.random() * 8)
      const access = 1 + Math.floor(Math.random() * 8)
      if (gate === access) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        gateCivId: gate,
        accessCivId: access,
        form,
        gateAuthority: 20 + Math.random() * 40,
        accessControl: 25 + Math.random() * 35,
        keyHolding: 10 + Math.random() * 30,
        curfewEnforcement: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.gateAuthority = Math.max(5, Math.min(85, a.gateAuthority + (Math.random() - 0.48) * 0.12))
      a.accessControl = Math.max(10, Math.min(90, a.accessControl + (Math.random() - 0.5) * 0.11))
      a.keyHolding = Math.max(5, Math.min(80, a.keyHolding + (Math.random() - 0.42) * 0.13))
      a.curfewEnforcement = Math.max(5, Math.min(65, a.curfewEnforcement + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
