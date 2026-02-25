// Diplomatic Confederation System (v3.499) - Confederation pacts
// Loose alliances of sovereign civilizations for common purposes

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ConfederationForm = 'defense_league' | 'trade_bloc' | 'cultural_alliance' | 'resource_compact'

export interface ConfederationPact {
  id: number
  civIdA: number
  civIdB: number
  form: ConfederationForm
  cohesionLevel: number
  sovereigntyPreserved: number
  commonPurpose: number
  decisionConsensus: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2540
const PROCEED_CHANCE = 0.0021
const MAX_PACTS = 17

const FORMS: ConfederationForm[] = ['defense_league', 'trade_bloc', 'cultural_alliance', 'resource_compact']

export class DiplomaticConfederationSystem {
  private pacts: ConfederationPact[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.pacts.length < MAX_PACTS && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.pacts.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        cohesionLevel: 25 + Math.random() * 40,
        sovereigntyPreserved: 20 + Math.random() * 35,
        commonPurpose: 15 + Math.random() * 30,
        decisionConsensus: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const p of this.pacts) {
      p.duration += 1
      p.cohesionLevel = Math.max(10, Math.min(90, p.cohesionLevel + (Math.random() - 0.47) * 0.12))
      p.sovereigntyPreserved = Math.max(10, Math.min(85, p.sovereigntyPreserved + (Math.random() - 0.5) * 0.11))
      p.commonPurpose = Math.max(5, Math.min(75, p.commonPurpose + (Math.random() - 0.45) * 0.10))
      p.decisionConsensus = Math.max(5, Math.min(65, p.decisionConsensus + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 95000
    for (let i = this.pacts.length - 1; i >= 0; i--) {
      if (this.pacts[i].tick < cutoff) this.pacts.splice(i, 1)
    }
  }

  getPacts(): ConfederationPact[] { return this.pacts }
}
