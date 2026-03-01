// Diplomatic Custodianship System (v3.538) - Custodianship arrangements
// Civilizations assuming custodial responsibility over territories or resources

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type CustodianshipForm = 'territorial_custody' | 'resource_custody' | 'cultural_custody' | 'military_custody'

export interface CustodianshipArrangement {
  id: number
  custodianCivId: number
  wardCivId: number
  form: CustodianshipForm
  custodyScope: number
  trustLevel: number
  autonomyGrant: number
  oversightRigor: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2550
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: CustodianshipForm[] = ['territorial_custody', 'resource_custody', 'cultural_custody', 'military_custody']

export class DiplomaticCustodianshipSystem {
  private arrangements: CustodianshipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const custodian = 1 + Math.floor(Math.random() * 8)
      const ward = 1 + Math.floor(Math.random() * 8)
      if (custodian === ward) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        custodianCivId: custodian,
        wardCivId: ward,
        form,
        custodyScope: 20 + Math.random() * 40,
        trustLevel: 25 + Math.random() * 35,
        autonomyGrant: 10 + Math.random() * 30,
        oversightRigor: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.custodyScope = Math.max(5, Math.min(85, a.custodyScope + (Math.random() - 0.48) * 0.12))
      a.trustLevel = Math.max(10, Math.min(90, a.trustLevel + (Math.random() - 0.5) * 0.11))
      a.autonomyGrant = Math.max(5, Math.min(80, a.autonomyGrant + (Math.random() - 0.42) * 0.13))
      a.oversightRigor = Math.max(5, Math.min(65, a.oversightRigor + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
