// Diplomatic Portreeve System (v3.734) - Portreeve harbor governance
// Officials governing port towns and managing maritime trade agreements between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type PortreeveForm = 'royal_portreeve' | 'merchant_portreeve' | 'naval_portreeve' | 'customs_portreeve'

export interface PortreeveArrangement {
  id: number
  enforcingCivId: number
  subjectCivId: number
  form: PortreeveForm
  harborAuthority: number
  tradeRegulation: number
  maritimeCompliance: number
  dockageControl: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3118
const PROCEED_CHANCE = 0.0023
const MAX_ARRANGEMENTS = 18

const FORMS: PortreeveForm[] = ['royal_portreeve', 'merchant_portreeve', 'naval_portreeve', 'customs_portreeve']

export class DiplomaticPortreeveSystem {
  private arrangements: PortreeveArrangement[] = []
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
        harborAuthority: 24 + Math.random() * 36,
        tradeRegulation: 22 + Math.random() * 38,
        maritimeCompliance: 14 + Math.random() * 26,
        dockageControl: 18 + Math.random() * 22,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.harborAuthority = Math.max(5, Math.min(85, a.harborAuthority + (Math.random() - 0.46) * 0.14))
      a.tradeRegulation = Math.max(10, Math.min(90, a.tradeRegulation + (Math.random() - 0.5) * 0.12))
      a.maritimeCompliance = Math.max(5, Math.min(80, a.maritimeCompliance + (Math.random() - 0.44) * 0.11))
      a.dockageControl = Math.max(5, Math.min(65, a.dockageControl + (Math.random() - 0.47) * 0.10))
    }

    const cutoff = tick - 90000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): PortreeveArrangement[] { return this.arrangements }
}
