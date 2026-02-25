// Diplomatic Reciprocity System (v3.364) - Reciprocity agreements
// Mutual exchange agreements ensuring balanced benefits between civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ReciprocityDomain = 'trade' | 'military' | 'cultural' | 'technological'

export interface ReciprocityAgreement {
  id: number
  civIdA: number
  civIdB: number
  domain: ReciprocityDomain
  balanceIndex: number
  exchangeVolume: number
  fairnessRating: number
  satisfaction: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2350
const TREATY_CHANCE = 0.0027
const MAX_AGREEMENTS = 20

const DOMAINS: ReciprocityDomain[] = ['trade', 'military', 'cultural', 'technological']

export class DiplomaticReciprocitySystem {
  private agreements: ReciprocityAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < TREATY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)]

      this.agreements.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        domain,
        balanceIndex: 40 + Math.random() * 20,
        exchangeVolume: 10 + Math.random() * 30,
        fairnessRating: 30 + Math.random() * 35,
        satisfaction: 25 + Math.random() * 30,
        duration: 0,
        tick,
      })
    }

    for (const a of this.agreements) {
      a.duration += 1
      a.balanceIndex = Math.max(20, Math.min(80, a.balanceIndex + (Math.random() - 0.5) * 0.14))
      a.exchangeVolume = Math.max(5, Math.min(70, a.exchangeVolume + (Math.random() - 0.46) * 0.12))
      a.fairnessRating = Math.max(15, Math.min(85, a.fairnessRating + (Math.random() - 0.47) * 0.11))
      a.satisfaction = Math.max(10, Math.min(80, a.satisfaction + (Math.random() - 0.45) * 0.1))
    }

    const cutoff = tick - 84000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

  getAgreements(): ReciprocityAgreement[] { return this.agreements }
}
