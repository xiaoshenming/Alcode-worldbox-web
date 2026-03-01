// Diplomatic Marriage System (v3.93) - Political marriages forge alliances between civilizations
// Royal, noble, and strategic unions stabilize relations and extend influence

import { Civilization } from '../civilization/Civilization'
import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'

export type MarriageType = 'royal' | 'noble' | 'strategic' | 'peace_offering'

export interface PoliticalMarriage {
  id: number
  type: MarriageType
  civA: number
  civB: number
  stability: number
  influence: number
  tick: number
}

const CHECK_INTERVAL = 2500
const MARRIAGE_CHANCE = 0.002
const MAX_MARRIAGES = 30

const MARRIAGE_TYPES: MarriageType[] = ['royal', 'noble', 'strategic', 'peace_offering']

const INFLUENCE_BASE: Record<MarriageType, number> = {
  royal: 40, noble: 25, strategic: 30, peace_offering: 20,
}

export class DiplomaticMarriageSystem {
  private _civsBuf: Civilization[] = []
  private marriages: PoliticalMarriage[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Arrange new marriages
    if (this.marriages.length < MAX_MARRIAGES && civManager?.civilizations) {
      const civs = this._civsBuf; civs.length = 0
    for (const civ of civManager.civilizations.values()) civs.push(civ)
      if (civs.length >= 2 && Math.random() < MARRIAGE_CHANCE) {
        const a = civs[Math.floor(Math.random() * civs.length)]
        let b = civs[Math.floor(Math.random() * civs.length)]
        if (a.id !== b.id) {
          const rel = a.relations?.get(b.id) ?? 0
          if (rel >= 0) {
            const type = MARRIAGE_TYPES[Math.floor(Math.random() * MARRIAGE_TYPES.length)]
            this.marriages.push({
              id: this.nextId++,
              type,
              civA: a.id,
              civB: b.id,
              stability: 50 + Math.random() * 40,
              influence: INFLUENCE_BASE[type] * (0.6 + Math.random() * 0.4),
              tick,
            })
          }
        }
      }
    }

    // Update existing marriages
    for (let i = this.marriages.length - 1; i >= 0; i--) {
      const m = this.marriages[i]

      m.stability += (Math.random() - 0.48) * 4
      m.stability = Math.max(0, Math.min(100, m.stability))
      m.influence = Math.min(100, m.influence + 0.1)

      // Apply relation bonus
      if (civManager?.civilizations) {
        const civA = civManager.civilizations.get(m.civA)
        const civB = civManager.civilizations.get(m.civB)
        if (civA && civB) {
          const bonus = m.stability * 0.002
          const relA = civA.relations?.get(m.civB) ?? 0
          civA.relations?.set(m.civB, Math.min(100, relA + bonus))
          const relB = civB.relations?.get(m.civA) ?? 0
          civB.relations?.set(m.civA, Math.min(100, relB + bonus))
        }
      }

      // Dissolve unstable marriages
      if (m.stability <= 0) {
        this.marriages.splice(i, 1)
      }
    }
  }

  private _marriagesBuf: PoliticalMarriage[] = []
}
