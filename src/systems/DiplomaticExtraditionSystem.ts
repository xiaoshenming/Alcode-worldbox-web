// Diplomatic Extradition System (v3.255) - Extradition agreements between civilizations
// Civilizations negotiate treaties to return fugitives and criminals across borders

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ExtraditionCategory = 'criminal' | 'political' | 'military' | 'universal'

export interface ExtraditionAgreement {
  id: number
  requestorCivId: number
  responderCivId: number
  category: ExtraditionCategory
  compliance: number
  casesProcessed: number
  trustLevel: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2500
const TREATY_CHANCE = 0.003
const MAX_AGREEMENTS = 24

const CATEGORIES: ExtraditionCategory[] = ['criminal', 'political', 'military', 'universal']

export class DiplomaticExtraditionSystem {
  private agreements: ExtraditionAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < TREATY_CHANCE) {
      const req = 1 + Math.floor(Math.random() * 8)
      const resp = 1 + Math.floor(Math.random() * 8)
      if (req === resp) return

      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]

      this.agreements.push({
        id: this.nextId++,
        requestorCivId: req,
        responderCivId: resp,
        category,
        compliance: 40 + Math.random() * 40,
        casesProcessed: 0,
        trustLevel: 30 + Math.random() * 40,
        duration: 0,
        tick,
      })
    }

    for (const agreement of this.agreements) {
      agreement.duration += 1
      agreement.compliance = Math.max(15, Math.min(100, agreement.compliance + (Math.random() - 0.45) * 0.15))
      agreement.trustLevel = Math.max(10, Math.min(100, agreement.trustLevel + (Math.random() - 0.48) * 0.1))
      if (Math.random() < 0.004) agreement.casesProcessed += 1
    }

    const cutoff = tick - 80000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

  getAgreements(): ExtraditionAgreement[] { return this.agreements }
}
