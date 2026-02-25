// Diplomatic Marriage System (v2.88) - Royal marriages between civilizations
// Marriages forge alliances, produce heirs, and can be annulled causing diplomatic crises

import { CivManager } from '../civilization/CivManager'

export type MarriageStatus = 'betrothed' | 'married' | 'annulled' | 'widowed'

export interface RoyalMarriage {
  id: number
  civA: number
  civB: number
  status: MarriageStatus
  harmony: number       // 0-100, marriage quality
  establishedTick: number
  heirs: number
  allianceBonus: number // relation bonus while married
}

const CHECK_INTERVAL = 1100
const MAX_MARRIAGES = 10
const MARRIAGE_CHANCE = 0.008
const HEIR_CHANCE = 0.02
const ANNUL_THRESHOLD = 15
const HARMONY_DECAY = 0.2
const ALLIANCE_BONUS = 3

export class DiplomaticMarriageSystem {
  private marriages: RoyalMarriage[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.arrangeMarriages(civManager, tick)
    this.updateMarriages(civManager, tick)
    this.cleanup()
  }

  private arrangeMarriages(civManager: CivManager, tick: number): void {
    if (this.marriages.length >= MAX_MARRIAGES) return

    const civs = Array.from(civManager.civilizations.values())
    if (civs.length < 2) return

    for (let i = 0; i < civs.length; i++) {
      if (Math.random() > MARRIAGE_CHANCE) continue

      for (let j = i + 1; j < civs.length; j++) {
        const rel = civs[i].relations.get(civs[j].id) ?? 0
        // Need positive relations for marriage
        if (rel < 10) continue

        // Check not already married
        const alreadyMarried = this.marriages.some(
          m => m.status === 'married' &&
            ((m.civA === civs[i].id && m.civB === civs[j].id) ||
             (m.civA === civs[j].id && m.civB === civs[i].id))
        )
        if (alreadyMarried) continue

        this.marriages.push({
          id: this.nextId++,
          civA: civs[i].id,
          civB: civs[j].id,
          status: 'married',
          harmony: 60 + Math.random() * 30,
          establishedTick: tick,
          heirs: 0,
          allianceBonus: ALLIANCE_BONUS,
        })
        break
      }
    }
  }

  private updateMarriages(civManager: CivManager, _tick: number): void {
    for (const marriage of this.marriages) {
      if (marriage.status !== 'married') continue

      // Harmony fluctuates
      marriage.harmony += (Math.random() - 0.55) * 4
      marriage.harmony = Math.max(0, Math.min(100, marriage.harmony))

      // Produce heirs
      if (marriage.harmony > 50 && Math.random() < HEIR_CHANCE) {
        marriage.heirs++
        marriage.harmony = Math.min(100, marriage.harmony + 5)
      }

      // Apply alliance bonus to relations
      const civA = civManager.civilizations.get(marriage.civA)
      const civB = civManager.civilizations.get(marriage.civB)
      if (civA && civB) {
        const relA = civA.relations.get(marriage.civB) ?? 0
        civA.relations.set(marriage.civB, Math.min(100, relA + marriage.allianceBonus * 0.1))
        const relB = civB.relations.get(marriage.civA) ?? 0
        civB.relations.set(marriage.civA, Math.min(100, relB + marriage.allianceBonus * 0.1))
      }

      // Low harmony can lead to annulment
      if (marriage.harmony < ANNUL_THRESHOLD && Math.random() < 0.08) {
        marriage.status = 'annulled'
        // Annulment damages relations
        if (civA && civB) {
          const relA = civA.relations.get(marriage.civB) ?? 0
          civA.relations.set(marriage.civB, Math.max(-100, relA - 20))
          const relB = civB.relations.get(marriage.civA) ?? 0
          civB.relations.set(marriage.civA, Math.max(-100, relB - 20))
        }
      }

      // Natural harmony decay
      marriage.harmony = Math.max(0, marriage.harmony - HARMONY_DECAY)
    }
  }

  private cleanup(): void {
    // Keep only recent annulled/widowed for history
    const active = this.marriages.filter(m => m.status === 'married' || m.status === 'betrothed')
    const ended = this.marriages.filter(m => m.status === 'annulled' || m.status === 'widowed')
    if (ended.length > 15) {
      this.marriages = [...active, ...ended.slice(-15)]
    }
  }

  getMarriages(): RoyalMarriage[] { return this.marriages }
  getActiveMarriages(): RoyalMarriage[] { return this.marriages.filter(m => m.status === 'married') }
  getTotalHeirs(): number { return this.marriages.reduce((sum, m) => sum + m.heirs, 0) }
}
