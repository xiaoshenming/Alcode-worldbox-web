// Diplomatic Adjudication System (v3.235) - Formal dispute resolution by neutral judges
// Civilizations submit disputes to impartial adjudicators for binding rulings

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type DisputeType = 'border' | 'trade' | 'resource' | 'succession'

export interface Adjudication {
  id: number
  plaintiffCivId: number
  defendantCivId: number
  disputeType: DisputeType
  adjudicatorCivId: number
  evidence: number
  ruling: 'plaintiff' | 'defendant' | 'compromise'
  compliance: number
  tick: number
}

const CHECK_INTERVAL = 2300
const ADJUDICATE_CHANCE = 0.003
const MAX_ADJUDICATIONS = 26

const DISPUTE_TYPES: DisputeType[] = ['border', 'trade', 'resource', 'succession']

export class DiplomaticAdjudicationSystem {
  private adjudications: Adjudication[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.adjudications.length < MAX_ADJUDICATIONS && Math.random() < ADJUDICATE_CHANCE) {
      const plaintiffCivId = 1 + Math.floor(Math.random() * 8)
      const defendantCivId = 1 + Math.floor(Math.random() * 8)
      if (plaintiffCivId === defendantCivId) return

      let adjudicatorCivId = 1 + Math.floor(Math.random() * 8)
      while (adjudicatorCivId === plaintiffCivId || adjudicatorCivId === defendantCivId) {
        adjudicatorCivId = 1 + Math.floor(Math.random() * 8)
      }

      const disputeType = DISPUTE_TYPES[Math.floor(Math.random() * DISPUTE_TYPES.length)]
      const evidence = 20 + Math.random() * 70
      const roll = Math.random()
      const ruling = roll < 0.35 ? 'plaintiff' as const : roll < 0.7 ? 'defendant' as const : 'compromise' as const

      this.adjudications.push({
        id: this.nextId++,
        plaintiffCivId,
        defendantCivId,
        disputeType,
        adjudicatorCivId,
        evidence,
        ruling,
        compliance: 40 + Math.random() * 50,
        tick,
      })
    }

    const cutoff = tick - 54000
    for (let i = this.adjudications.length - 1; i >= 0; i--) {
      if (this.adjudications[i].tick < cutoff) {
        this.adjudications.splice(i, 1)
      }
    }
  }

  getAdjudications(): readonly Adjudication[] { return this.adjudications }
  getByDispute(type: DisputeType): Adjudication[] {
    return this.adjudications.filter(a => a.disputeType === type)
  }
}
