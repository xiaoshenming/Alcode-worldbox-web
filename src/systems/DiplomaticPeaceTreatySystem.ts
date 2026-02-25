// Diplomatic Peace Treaty System (v3.63) - Formal peace treaties between civilizations
// Treaties end wars, establish borders, and create lasting diplomatic bonds

import { EntityManager } from '../ecs/Entity'

export type TreatyStatus = 'negotiating' | 'signed' | 'honored' | 'violated' | 'expired'
export type TreatyTerm = 'ceasefire' | 'border_recognition' | 'trade_access' | 'prisoner_exchange' | 'reparations' | 'non_aggression'

export interface PeaceTreaty {
  id: number
  civAId: number
  civBId: number
  status: TreatyStatus
  terms: TreatyTerm[]
  trustBonus: number
  duration: number
  negotiationProgress: number
  startTick: number
}

const CHECK_INTERVAL = 1500
const TREATY_CHANCE = 0.003
const MAX_TREATIES = 15
const NEGOTIATION_RATE = 0.08
const SIGN_THRESHOLD = 75

const TERMS: TreatyTerm[] = ['ceasefire', 'border_recognition', 'trade_access', 'prisoner_exchange', 'reparations', 'non_aggression']

export class DiplomaticPeaceTreatySystem {
  private treaties: PeaceTreaty[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, civManager: any, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (!civManager?.civilizations) return
    const civs = civManager.civilizations
    if (civs.length < 2) return

    // Start new treaty negotiations
    if (this.treaties.length < MAX_TREATIES && Math.random() < TREATY_CHANCE) {
      const iA = Math.floor(Math.random() * civs.length)
      let iB = Math.floor(Math.random() * civs.length)
      if (iB === iA) iB = (iB + 1) % civs.length

      // Select 2-4 random terms
      const numTerms = 2 + Math.floor(Math.random() * 3)
      const shuffled = [...TERMS].sort(() => Math.random() - 0.5)
      const selectedTerms = shuffled.slice(0, numTerms)

      this.treaties.push({
        id: this.nextId++,
        civAId: civs[iA].id,
        civBId: civs[iB].id,
        status: 'negotiating',
        terms: selectedTerms,
        trustBonus: 10 + Math.random() * 25,
        duration: 5000 + Math.random() * 10000,
        negotiationProgress: 0,
        startTick: tick,
      })
    }

    // Update treaties
    for (let i = this.treaties.length - 1; i >= 0; i--) {
      const t = this.treaties[i]
      const elapsed = tick - t.startTick

      if (t.status === 'negotiating') {
        t.negotiationProgress += NEGOTIATION_RATE * (0.5 + Math.random())
        if (t.negotiationProgress >= SIGN_THRESHOLD) {
          t.status = Math.random() < 0.7 ? 'signed' : 'violated'
        }
      } else if (t.status === 'signed') {
        // Check for violations
        if (Math.random() < 0.002) {
          t.status = 'violated'
        } else if (elapsed > t.duration * 0.8) {
          t.status = 'honored'
        }
      }

      // Expire old treaties
      if (elapsed > t.duration) {
        if (t.status !== 'violated') t.status = 'expired'
        this.treaties.splice(i, 1)
      }
    }
  }

  getTreaties(): readonly PeaceTreaty[] { return this.treaties }
  getTreatiesBetween(civA: number, civB: number): PeaceTreaty[] {
    return this.treaties.filter(t =>
      (t.civAId === civA && t.civBId === civB) || (t.civAId === civB && t.civBId === civA)
    )
  }
}
