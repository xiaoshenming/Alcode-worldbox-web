// Diplomatic Mediation System (v3.340) - Mediation agreements
// Neutral third-party facilitation to resolve conflicts peacefully

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MediationMethod = 'facilitative' | 'evaluative' | 'transformative' | 'narrative'

export interface MediationCase {
  id: number
  civIdA: number
  civIdB: number
  method: MediationMethod
  neutrality: number
  progressRate: number
  satisfactionA: number
  satisfactionB: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2340
const TREATY_CHANCE = 0.0027
const MAX_CASES = 20

const METHODS: MediationMethod[] = ['facilitative', 'evaluative', 'transformative', 'narrative']

export class DiplomaticMediationSystem {
  private cases: MediationCase[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.cases.length < MAX_CASES && Math.random() < TREATY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const method = METHODS[Math.floor(Math.random() * METHODS.length)]

      this.cases.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        method,
        neutrality: 40 + Math.random() * 35,
        progressRate: 5 + Math.random() * 20,
        satisfactionA: 25 + Math.random() * 35,
        satisfactionB: 25 + Math.random() * 35,
        duration: 0,
        tick,
      })
    }

    for (const c of this.cases) {
      c.duration += 1
      c.neutrality = Math.max(20, Math.min(95, c.neutrality + (Math.random() - 0.48) * 0.11))
      c.progressRate = Math.max(2, Math.min(60, c.progressRate + (Math.random() - 0.45) * 0.12))
      c.satisfactionA = Math.max(10, Math.min(90, c.satisfactionA + (Math.random() - 0.47) * 0.13))
      c.satisfactionB = Math.max(10, Math.min(90, c.satisfactionB + (Math.random() - 0.47) * 0.13))
    }

    const cutoff = tick - 81000
    for (let i = this.cases.length - 1; i >= 0; i--) {
      if (this.cases[i].tick < cutoff) this.cases.splice(i, 1)
    }
  }

  getCases(): MediationCase[] { return this.cases }
}
