// Diplomatic Adjudication System (v3.454) - Adjudication diplomacy
// Formal legal proceedings to resolve inter-civilization disputes

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AdjudicationVerdict = 'pending' | 'favor_a' | 'favor_b' | 'split' | 'dismissed'

export interface AdjudicationCase {
  id: number
  plaintiffCivId: number
  defendantCivId: number
  verdict: AdjudicationVerdict
  evidenceStrength: number
  legalPrecedent: number
  publicOpinion: number
  hearingProgress: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2580
const FILE_CHANCE = 0.0019
const MAX_CASES = 16

export class DiplomaticAdjudicationSystem {
  private cases: AdjudicationCase[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.cases.length < MAX_CASES && Math.random() < FILE_CHANCE) {
      const a = 1 + Math.floor(Math.random() * 8)
      const b = 1 + Math.floor(Math.random() * 8)
      if (a === b) return

      this.cases.push({
        id: this.nextId++,
        plaintiffCivId: a,
        defendantCivId: b,
        verdict: 'pending',
        evidenceStrength: 10 + Math.random() * 40,
        legalPrecedent: 5 + Math.random() * 30,
        publicOpinion: 30 + Math.random() * 40,
        hearingProgress: 0,
        duration: 0,
        tick,
      })
    }

    for (const c of this.cases) {
      c.duration++
      c.hearingProgress = Math.min(100, c.hearingProgress + 0.5)
      c.evidenceStrength = Math.min(100, c.evidenceStrength + 0.02)
      if (c.hearingProgress > 80 && c.verdict === 'pending') {
        const roll = Math.random()
        if (roll < 0.3) c.verdict = 'favor_a'
        else if (roll < 0.6) c.verdict = 'favor_b'
        else if (roll < 0.85) c.verdict = 'split'
        else c.verdict = 'dismissed'
      }
    }

    this.cases = this.cases.filter(c => c.verdict === 'pending' || c.duration < 80)
  }

  getCases(): AdjudicationCase[] { return this.cases }
}
