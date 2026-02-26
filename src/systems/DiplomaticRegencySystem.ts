// Diplomatic Regency System (v3.532) - Regency governance
// Temporary governance arrangements where one civilization rules on behalf of another

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type RegencyForm = 'royal_regency' | 'military_regency' | 'council_regency' | 'ecclesiastical_regency'

export interface RegencyArrangement {
  id: number
  regentCivId: number
  wardCivId: number
  form: RegencyForm
  authorityLevel: number
  legitimacy: number
  wardProgress: number
  stabilityIndex: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2570
const PROCEED_CHANCE = 0.0020
const MAX_ARRANGEMENTS = 14

const FORMS: RegencyForm[] = ['royal_regency', 'military_regency', 'council_regency', 'ecclesiastical_regency']

export class DiplomaticRegencySystem {
  private arrangements: RegencyArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const regent = 1 + Math.floor(Math.random() * 8)
      const ward = 1 + Math.floor(Math.random() * 8)
      if (regent === ward) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        regentCivId: regent,
        wardCivId: ward,
        form,
        authorityLevel: 25 + Math.random() * 40,
        legitimacy: 20 + Math.random() * 35,
        wardProgress: 10 + Math.random() * 25,
        stabilityIndex: 15 + Math.random() * 30,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.authorityLevel = Math.max(10, Math.min(85, a.authorityLevel + (Math.random() - 0.47) * 0.12))
      a.legitimacy = Math.max(10, Math.min(90, a.legitimacy + (Math.random() - 0.5) * 0.11))
      a.wardProgress = Math.max(5, Math.min(70, a.wardProgress + (Math.random() - 0.44) * 0.10))
      a.stabilityIndex = Math.max(5, Math.min(75, a.stabilityIndex + (Math.random() - 0.45) * 0.09))
    }

    const cutoff = tick - 90000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): RegencyArrangement[] { return this.arrangements }
}
