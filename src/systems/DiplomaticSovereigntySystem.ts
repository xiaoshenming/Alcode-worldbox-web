// Diplomatic Sovereignty System (v3.200) - Civilizations assert territorial sovereignty
// Disputes over borders and resources lead to diplomatic negotiations or conflict

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type SovereigntyClaim = 'territorial' | 'maritime' | 'resource' | 'cultural'

export interface SovereigntyDispute {
  id: number
  claimantCivId: number
  contestedCivId: number
  claimType: SovereigntyClaim
  legitimacy: number
  resistance: number
  resolved: boolean
  tick: number
}

const CHECK_INTERVAL = 5200
const DISPUTE_CHANCE = 0.003
const MAX_DISPUTES = 10

const CLAIM_TYPES: SovereigntyClaim[] = ['territorial', 'maritime', 'resource', 'cultural']

export class DiplomaticSovereigntySystem {
  private disputes: SovereigntyDispute[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.disputes.length < MAX_DISPUTES && Math.random() < DISPUTE_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length >= 2) {
        const claimant = entities[Math.floor(Math.random() * entities.length)]
        const contested = entities[Math.floor(Math.random() * entities.length)]
        if (claimant !== contested) {
          if (!this.disputes.some(d =>
            d.claimantCivId === claimant && d.contestedCivId === contested
          )) {
            const claimType = CLAIM_TYPES[Math.floor(Math.random() * CLAIM_TYPES.length)]
            this.disputes.push({
              id: this.nextId++,
              claimantCivId: claimant,
              contestedCivId: contested,
              claimType,
              legitimacy: 20 + Math.random() * 50,
              resistance: 15 + Math.random() * 40,
              resolved: false,
              tick,
            })
          }
        }
      }
    }

    for (const d of this.disputes) {
      if (d.resolved) continue
      d.legitimacy = Math.max(0, Math.min(100, d.legitimacy + (Math.random() - 0.45) * 3))
      d.resistance = Math.max(0, Math.min(100, d.resistance + (Math.random() - 0.5) * 4))
      if (d.legitimacy >= 90 || d.resistance >= 95 || d.legitimacy <= 5) {
        d.resolved = true
      }
    }

    for (let i = this.disputes.length - 1; i >= 0; i--) {
      const d = this.disputes[i]
      if (d.resolved || tick - d.tick > 60000) {
        this.disputes.splice(i, 1)
      }
    }
  }

  getDisputes(): readonly SovereigntyDispute[] { return this.disputes }
}
