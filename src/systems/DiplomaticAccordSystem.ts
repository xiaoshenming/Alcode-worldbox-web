// Diplomatic Accord System (v3.352) - Accord agreements
// Formal agreements reached through negotiation on specific issues

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AccordDomain = 'trade' | 'border' | 'resource' | 'cultural'

export interface AccordAgreement {
  id: number
  civIdA: number
  civIdB: number
  domain: AccordDomain
  bindingForce: number
  mutualSatisfaction: number
  implementationRate: number
  longevity: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2360
const TREATY_CHANCE = 0.0026
const MAX_ACCORDS = 20

const DOMAINS: AccordDomain[] = ['trade', 'border', 'resource', 'cultural']

export class DiplomaticAccordSystem {
  private accords: AccordAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.accords.length < MAX_ACCORDS && Math.random() < TREATY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)]

      this.accords.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        domain,
        bindingForce: 25 + Math.random() * 40,
        mutualSatisfaction: 30 + Math.random() * 35,
        implementationRate: 15 + Math.random() * 30,
        longevity: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.accords) {
      a.duration += 1
      a.bindingForce = Math.max(10, Math.min(90, a.bindingForce + (Math.random() - 0.47) * 0.11))
      a.mutualSatisfaction = Math.max(15, Math.min(90, a.mutualSatisfaction + (Math.random() - 0.46) * 0.12))
      a.implementationRate = Math.max(5, Math.min(80, a.implementationRate + (Math.random() - 0.45) * 0.1))
      a.longevity = Math.max(5, Math.min(70, a.longevity + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 83000
    for (let i = this.accords.length - 1; i >= 0; i--) {
      if (this.accords[i].tick < cutoff) this.accords.splice(i, 1)
    }
  }

}
