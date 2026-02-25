// Diplomatic Ratification System (v3.230) - Formal treaty ratification process
// Civilizations formally approve treaties through legislative bodies

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type TreatyType = 'peace' | 'trade' | 'defense' | 'non_aggression'

export interface Ratification {
  id: number
  civId: number
  targetCivId: number
  treatyType: TreatyType
  approvalRate: number
  legislatorsFor: number
  legislatorsAgainst: number
  ratified: boolean
  tick: number
}

const CHECK_INTERVAL = 2100
const RATIFY_CHANCE = 0.004
const MAX_RATIFICATIONS = 28

const TREATY_TYPES: TreatyType[] = ['peace', 'trade', 'defense', 'non_aggression']

export class DiplomaticRatificationSystem {
  private ratifications: Ratification[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.ratifications.length < MAX_RATIFICATIONS && Math.random() < RATIFY_CHANCE) {
      const civId = 1 + Math.floor(Math.random() * 8)
      const targetCivId = 1 + Math.floor(Math.random() * 8)
      if (civId === targetCivId) return

      const treatyType = TREATY_TYPES[Math.floor(Math.random() * TREATY_TYPES.length)]
      const totalLegislators = 10 + Math.floor(Math.random() * 40)
      const forPct = 25 + Math.random() * 55
      const legislatorsFor = Math.floor(totalLegislators * forPct / 100)
      const legislatorsAgainst = totalLegislators - legislatorsFor

      this.ratifications.push({
        id: this.nextId++,
        civId,
        targetCivId,
        treatyType,
        approvalRate: forPct,
        legislatorsFor,
        legislatorsAgainst,
        ratified: forPct > 50,
        tick,
      })
    }

    const cutoff = tick - 52000
    for (let i = this.ratifications.length - 1; i >= 0; i--) {
      if (this.ratifications[i].tick < cutoff) {
        this.ratifications.splice(i, 1)
      }
    }
  }

  getRatifications(): readonly Ratification[] { return this.ratifications }
  getByTreaty(type: TreatyType): Ratification[] {
    return this.ratifications.filter(r => r.treatyType === type)
  }
}
