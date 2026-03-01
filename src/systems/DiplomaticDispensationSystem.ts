// Diplomatic Dispensation System (v3.391) - Dispensation grants
// Special exemptions from rules or obligations granted between civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type DispensationForm = 'trade_exemption' | 'military_waiver' | 'tribute_relief' | 'law_exception'

export interface DispensationGrant {
  id: number
  civIdA: number
  civIdB: number
  form: DispensationForm
  exemptionScope: number
  politicalCost: number
  benefitValue: number
  precedentRisk: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2400
const GRANT_CHANCE = 0.0025
const MAX_GRANTS = 20

const FORMS: DispensationForm[] = ['trade_exemption', 'military_waiver', 'tribute_relief', 'law_exception']

export class DiplomaticDispensationSystem {
  private grants: DispensationGrant[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.grants.length < MAX_GRANTS && Math.random() < GRANT_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.grants.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        exemptionScope: 20 + Math.random() * 40,
        politicalCost: 15 + Math.random() * 30,
        benefitValue: 25 + Math.random() * 35,
        precedentRisk: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const g of this.grants) {
      g.duration += 1
      g.exemptionScope = Math.max(10, Math.min(80, g.exemptionScope + (Math.random() - 0.47) * 0.11))
      g.politicalCost = Math.max(5, Math.min(70, g.politicalCost + (Math.random() - 0.5) * 0.12))
      g.benefitValue = Math.max(10, Math.min(85, g.benefitValue + (Math.random() - 0.46) * 0.10))
      g.precedentRisk = Math.max(5, Math.min(60, g.precedentRisk + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 85000
    for (let i = this.grants.length - 1; i >= 0; i--) {
      if (this.grants[i].tick < cutoff) this.grants.splice(i, 1)
    }
  }

}
