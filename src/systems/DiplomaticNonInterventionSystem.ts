// Diplomatic Non-Intervention System (v3.319) - Non-intervention pacts
// Agreements where civilizations pledge not to interfere in each other's internal affairs

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type InterventionScope = 'military' | 'political' | 'economic' | 'total'

export interface NonInterventionPact {
  id: number
  civIdA: number
  civIdB: number
  scope: InterventionScope
  sovereignty: number
  compliance: number
  mutualTrust: number
  diplomaticStability: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2450
const PACT_CHANCE = 0.003
const MAX_PACTS = 20

const SCOPES: InterventionScope[] = ['military', 'political', 'economic', 'total']

export class DiplomaticNonInterventionSystem {
  private pacts: NonInterventionPact[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.pacts.length < MAX_PACTS && Math.random() < PACT_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const scope = SCOPES[Math.floor(Math.random() * SCOPES.length)]

      this.pacts.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        scope,
        sovereignty: 35 + Math.random() * 40,
        compliance: 40 + Math.random() * 35,
        mutualTrust: 25 + Math.random() * 35,
        diplomaticStability: 30 + Math.random() * 30,
        duration: 0,
        tick,
      })
    }

    for (const pact of this.pacts) {
      pact.duration += 1
      pact.sovereignty = Math.max(10, Math.min(100, pact.sovereignty + (Math.random() - 0.47) * 0.13))
      pact.compliance = Math.max(10, Math.min(95, pact.compliance + (Math.random() - 0.48) * 0.12))
      pact.mutualTrust = Math.max(5, Math.min(90, pact.mutualTrust + (Math.random() - 0.46) * 0.15))
      pact.diplomaticStability = Math.max(8, Math.min(85, pact.diplomaticStability + (Math.random() - 0.49) * 0.11))
    }

    const cutoff = tick - 83000
    for (let i = this.pacts.length - 1; i >= 0; i--) {
      if (this.pacts[i].tick < cutoff) this.pacts.splice(i, 1)
    }
  }

}
