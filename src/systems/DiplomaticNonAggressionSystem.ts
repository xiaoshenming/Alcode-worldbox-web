// Diplomatic Non-Aggression System (v3.310) - Non-aggression pacts
// Bilateral agreements where civilizations pledge not to attack each other

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type PactStrength = 'symbolic' | 'binding' | 'enforced' | 'sacred'

export interface NonAggressionPact {
  id: number
  civIdA: number
  civIdB: number
  pactStrength: PactStrength
  trust: number
  compliance: number
  borderTension: number
  tradeBonus: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2400
const PACT_CHANCE = 0.003
const MAX_PACTS = 20

const STRENGTHS: PactStrength[] = ['symbolic', 'binding', 'enforced', 'sacred']

export class DiplomaticNonAggressionSystem {
  private pacts: NonAggressionPact[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.pacts.length < MAX_PACTS && Math.random() < PACT_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const strength = STRENGTHS[Math.floor(Math.random() * STRENGTHS.length)]

      this.pacts.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        pactStrength: strength,
        trust: 30 + Math.random() * 40,
        compliance: 50 + Math.random() * 30,
        borderTension: 10 + Math.random() * 30,
        tradeBonus: 5 + Math.random() * 20,
        duration: 0,
        tick,
      })
    }

    for (const pact of this.pacts) {
      pact.duration += 1
      pact.trust = Math.max(5, Math.min(100, pact.trust + (Math.random() - 0.47) * 0.15))
      pact.compliance = Math.max(10, Math.min(100, pact.compliance + (Math.random() - 0.48) * 0.12))
      pact.borderTension = Math.max(2, Math.min(60, pact.borderTension + (Math.random() - 0.52) * 0.18))
      pact.tradeBonus = Math.max(2, Math.min(40, pact.tradeBonus + (Math.random() - 0.45) * 0.1))
    }

    const cutoff = tick - 82000
    for (let i = this.pacts.length - 1; i >= 0; i--) {
      if (this.pacts[i].tick < cutoff) this.pacts.splice(i, 1)
    }
  }

}
