// Diplomatic Conciliation System (v3.343) - Conciliation agreements
// Formal processes to settle disputes through mutual compromise

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ConciliationApproach = 'compromise' | 'accommodation' | 'collaboration' | 'integration'

export interface ConciliationAgreement {
  id: number
  civIdA: number
  civIdB: number
  approach: ConciliationApproach
  willingness: number
  progressRate: number
  mutualBenefit: number
  stabilityGain: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2370
const TREATY_CHANCE = 0.0026
const MAX_TREATIES = 20

const APPROACHES: ConciliationApproach[] = ['compromise', 'accommodation', 'collaboration', 'integration']

export class DiplomaticConciliationSystem {
  private treaties: ConciliationAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.treaties.length < MAX_TREATIES && Math.random() < TREATY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const approach = APPROACHES[Math.floor(Math.random() * APPROACHES.length)]

      this.treaties.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        approach,
        willingness: 20 + Math.random() * 35,
        progressRate: 5 + Math.random() * 20,
        mutualBenefit: 10 + Math.random() * 30,
        stabilityGain: 8 + Math.random() * 22,
        duration: 0,
        tick,
      })
    }

    for (const treaty of this.treaties) {
      treaty.duration += 1
      treaty.willingness = Math.max(10, Math.min(85, treaty.willingness + (Math.random() - 0.46) * 0.12))
      treaty.progressRate = Math.max(3, Math.min(65, treaty.progressRate + (Math.random() - 0.45) * 0.11))
      treaty.mutualBenefit = Math.max(5, Math.min(75, treaty.mutualBenefit + (Math.random() - 0.44) * 0.1))
      treaty.stabilityGain = Math.max(3, Math.min(60, treaty.stabilityGain + (Math.random() - 0.47) * 0.09))
    }

    const cutoff = tick - 82000
    for (let i = this.treaties.length - 1; i >= 0; i--) {
      if (this.treaties[i].tick < cutoff) this.treaties.splice(i, 1)
    }
  }

  getTreaties(): ConciliationAgreement[] { return this.treaties }
}
