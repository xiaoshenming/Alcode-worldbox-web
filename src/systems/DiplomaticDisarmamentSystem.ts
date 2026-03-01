// Diplomatic Disarmament System (v3.325) - Disarmament treaties
// Agreements to reduce military forces and weapons stockpiles

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type DisarmamentScope = 'partial' | 'regional' | 'bilateral' | 'comprehensive'

export interface DisarmamentTreaty {
  id: number
  civIdA: number
  civIdB: number
  scope: DisarmamentScope
  armsReduction: number
  verificationLevel: number
  complianceRate: number
  peaceDividend: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2350
const TREATY_CHANCE = 0.0028
const MAX_TREATIES = 20

const SCOPES: DisarmamentScope[] = ['partial', 'regional', 'bilateral', 'comprehensive']

export class DiplomaticDisarmamentSystem {
  private treaties: DisarmamentTreaty[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.treaties.length < MAX_TREATIES && Math.random() < TREATY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const scope = SCOPES[Math.floor(Math.random() * SCOPES.length)]

      this.treaties.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        scope,
        armsReduction: 10 + Math.random() * 30,
        verificationLevel: 20 + Math.random() * 40,
        complianceRate: 40 + Math.random() * 35,
        peaceDividend: 5 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const treaty of this.treaties) {
      treaty.duration += 1
      treaty.armsReduction = Math.max(5, Math.min(80, treaty.armsReduction + (Math.random() - 0.46) * 0.13))
      treaty.verificationLevel = Math.max(10, Math.min(90, treaty.verificationLevel + (Math.random() - 0.47) * 0.11))
      treaty.complianceRate = Math.max(15, Math.min(100, treaty.complianceRate + (Math.random() - 0.48) * 0.14))
      treaty.peaceDividend = Math.max(3, Math.min(60, treaty.peaceDividend + (Math.random() - 0.44) * 0.1))
    }

    const cutoff = tick - 85000
    for (let i = this.treaties.length - 1; i >= 0; i--) {
      if (this.treaties[i].tick < cutoff) this.treaties.splice(i, 1)
    }
  }

}
