// Diplomatic Coexistence System (v3.313) - Peaceful coexistence agreements
// Formal recognition of mutual right to exist and develop independently

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type CoexistenceLevel = 'tentative' | 'formal' | 'integrated' | 'harmonious'

export interface CoexistencePact {
  id: number
  civIdA: number
  civIdB: number
  level: CoexistenceLevel
  mutualRespect: number
  culturalExchange: number
  borderClarity: number
  sharedProsperity: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2500
const PACT_CHANCE = 0.003
const MAX_PACTS = 20

const LEVELS: CoexistenceLevel[] = ['tentative', 'formal', 'integrated', 'harmonious']

export class DiplomaticCoexistenceSystem {
  private pacts: CoexistencePact[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.pacts.length < MAX_PACTS && Math.random() < PACT_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const level = LEVELS[Math.floor(Math.random() * LEVELS.length)]

      this.pacts.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        level,
        mutualRespect: 30 + Math.random() * 40,
        culturalExchange: 10 + Math.random() * 30,
        borderClarity: 20 + Math.random() * 40,
        sharedProsperity: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const pact of this.pacts) {
      pact.duration += 1
      pact.mutualRespect = Math.max(5, Math.min(100, pact.mutualRespect + (Math.random() - 0.47) * 0.14))
      pact.culturalExchange = Math.max(3, Math.min(80, pact.culturalExchange + (Math.random() - 0.45) * 0.12))
      pact.borderClarity = Math.max(10, Math.min(90, pact.borderClarity + (Math.random() - 0.5) * 0.1))
      pact.sharedProsperity = Math.max(5, Math.min(70, pact.sharedProsperity + (Math.random() - 0.46) * 0.11))
    }

    const cutoff = tick - 84000
    for (let i = this.pacts.length - 1; i >= 0; i--) {
      if (this.pacts[i].tick < cutoff) this.pacts.splice(i, 1)
    }
  }

  getPacts(): CoexistencePact[] { return this.pacts }
}
