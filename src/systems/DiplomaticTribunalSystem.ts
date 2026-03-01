// Diplomatic Tribunal System (v3.205) - International tribunals adjudicate disputes between civilizations
// Tribunals enforce justice, settle territorial claims, and punish war crimes

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type TribunalCase = 'territorial' | 'war_crimes' | 'trade_violation' | 'treaty_breach'

export interface TribunalProceeding {
  id: number
  prosecutorCivId: number
  defendantCivId: number
  caseType: TribunalCase
  evidence: number
  verdict: number
  compliance: number
  tick: number
}

const CHECK_INTERVAL = 5500
const CASE_CHANCE = 0.003
const MAX_PROCEEDINGS = 8

const CASE_TYPES: TribunalCase[] = ['territorial', 'war_crimes', 'trade_violation', 'treaty_breach']

export class DiplomaticTribunalSystem {
  private proceedings: TribunalProceeding[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.proceedings.length < MAX_PROCEEDINGS && Math.random() < CASE_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length >= 2) {
        const prosecutor = entities[Math.floor(Math.random() * entities.length)]
        const defendant = entities[Math.floor(Math.random() * entities.length)]
        if (prosecutor !== defendant) {
          if (!this.proceedings.some(p =>
            p.prosecutorCivId === prosecutor && p.defendantCivId === defendant
          )) {
            const caseType = CASE_TYPES[Math.floor(Math.random() * CASE_TYPES.length)]
            this.proceedings.push({
              id: this.nextId++,
              prosecutorCivId: prosecutor,
              defendantCivId: defendant,
              caseType,
              evidence: 15 + Math.random() * 50,
              verdict: 50,
              compliance: 30 + Math.random() * 30,
              tick,
            })
          }
        }
      }
    }

    for (const p of this.proceedings) {
      p.evidence = Math.min(100, p.evidence + (Math.random() - 0.3) * 3)
      // Verdict shifts based on evidence
      if (p.evidence > 60) {
        p.verdict = Math.min(100, p.verdict + 2)
      } else if (p.evidence < 30) {
        p.verdict = Math.max(0, p.verdict - 2)
      }
      p.compliance = Math.max(0, Math.min(100, p.compliance + (Math.random() - 0.45) * 3))
    }

    for (let i = this.proceedings.length - 1; i >= 0; i--) {
      const p = this.proceedings[i]
      if (p.verdict >= 95 || p.verdict <= 5 || tick - p.tick > 65000) {
        this.proceedings.splice(i, 1)
      }
    }
  }

}
