// Diplomatic Arbitration System (v3.331) - Arbitration treaties
// Third-party resolution of disputes through binding arbitration

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ArbitrationType = 'territorial' | 'commercial' | 'military' | 'cultural'

export interface ArbitrationCase {
  id: number
  civIdA: number
  civIdB: number
  arbitrationType: ArbitrationType
  fairnessRating: number
  bindingStrength: number
  complianceRate: number
  disputeResolution: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2380
const TREATY_CHANCE = 0.0027
const MAX_CASES = 20

const TYPES: ArbitrationType[] = ['territorial', 'commercial', 'military', 'cultural']

export class DiplomaticArbitrationSystem {
  private cases: ArbitrationCase[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.cases.length < MAX_CASES && Math.random() < TREATY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const aType = TYPES[Math.floor(Math.random() * TYPES.length)]

      this.cases.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        arbitrationType: aType,
        fairnessRating: 30 + Math.random() * 40,
        bindingStrength: 20 + Math.random() * 45,
        complianceRate: 35 + Math.random() * 35,
        disputeResolution: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const c of this.cases) {
      c.duration += 1
      c.fairnessRating = Math.max(10, Math.min(90, c.fairnessRating + (Math.random() - 0.47) * 0.12))
      c.bindingStrength = Math.max(10, Math.min(85, c.bindingStrength + (Math.random() - 0.46) * 0.1))
      c.complianceRate = Math.max(15, Math.min(95, c.complianceRate + (Math.random() - 0.48) * 0.13))
      c.disputeResolution = Math.max(5, Math.min(75, c.disputeResolution + (Math.random() - 0.44) * 0.11))
    }

    const cutoff = tick - 80000
    for (let i = this.cases.length - 1; i >= 0; i--) {
      if (this.cases[i].tick < cutoff) this.cases.splice(i, 1)
    }
  }

}
