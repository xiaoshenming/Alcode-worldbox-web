// Diplomatic Gateward System (v3.736) - Gateward entry governance
// Wardens controlling city gates and managing entry agreements between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type GatewardForm = 'royal_gateward' | 'city_gateward' | 'fortress_gateward' | 'market_gateward'

export interface GatewardArrangement {
  id: number
  enforcingCivId: number
  subjectCivId: number
  form: GatewardForm
  entryAuthority: number
  gateControl: number
  curfewEnforcement: number
  passIssuance: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3148
const PROCEED_CHANCE = 0.0025
const MAX_ARRANGEMENTS = 20

const FORMS: GatewardForm[] = ['royal_gateward', 'city_gateward', 'fortress_gateward', 'market_gateward']

export class DiplomaticGatewardSystem {
  private arrangements: GatewardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const enforcing = 1 + Math.floor(Math.random() * 8)
      const subject = 1 + Math.floor(Math.random() * 8)
      if (enforcing === subject) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        enforcingCivId: enforcing,
        subjectCivId: subject,
        form,
        entryAuthority: 28 + Math.random() * 32,
        gateControl: 18 + Math.random() * 42,
        curfewEnforcement: 12 + Math.random() * 28,
        passIssuance: 20 + Math.random() * 20,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.entryAuthority = Math.max(5, Math.min(85, a.entryAuthority + (Math.random() - 0.44) * 0.16))
      a.gateControl = Math.max(10, Math.min(90, a.gateControl + (Math.random() - 0.5) * 0.14))
      a.curfewEnforcement = Math.max(5, Math.min(80, a.curfewEnforcement + (Math.random() - 0.40) * 0.12))
      a.passIssuance = Math.max(5, Math.min(65, a.passIssuance + (Math.random() - 0.49) * 0.08))
    }

    const cutoff = tick - 92000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
