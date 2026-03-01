// Diplomatic Federation System (v3.496) - Federation agreements
// Unions of civilizations sharing governance while retaining sovereignty

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type FederationForm = 'political_union' | 'economic_federation' | 'military_league' | 'cultural_federation'

export interface FederationAgreement {
  id: number
  civIdA: number
  civIdB: number
  form: FederationForm
  integrationLevel: number
  sharedGovernance: number
  memberAutonomy: number
  collectiveStrength: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2500
const PROCEED_CHANCE = 0.0022
const MAX_AGREEMENTS = 16

const FORMS: FederationForm[] = ['political_union', 'economic_federation', 'military_league', 'cultural_federation']

export class DiplomaticFederationSystem {
  private agreements: FederationAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.agreements.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        integrationLevel: 25 + Math.random() * 40,
        sharedGovernance: 20 + Math.random() * 35,
        memberAutonomy: 15 + Math.random() * 30,
        collectiveStrength: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.agreements) {
      a.duration += 1
      a.integrationLevel = Math.max(10, Math.min(90, a.integrationLevel + (Math.random() - 0.47) * 0.12))
      a.sharedGovernance = Math.max(10, Math.min(85, a.sharedGovernance + (Math.random() - 0.5) * 0.11))
      a.memberAutonomy = Math.max(5, Math.min(75, a.memberAutonomy + (Math.random() - 0.45) * 0.10))
      a.collectiveStrength = Math.max(5, Math.min(65, a.collectiveStrength + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 94000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

}
