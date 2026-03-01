// Diplomatic Arbitration System (v3.445) - Arbitration diplomacy
// Third-party resolution of disputes between civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type Arbitration2Form = 'binding_arbitration' | 'advisory_arbitration' | 'mediated_arbitration' | 'tribunal_ruling'

export interface Arbitration2Case {
  id: number
  civIdA: number
  civIdB: number
  form: Arbitration2Form
  evidenceStrength: number
  arbitratorImpartiality: number
  complianceRate: number
  rulingFairness: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2540
const PROCEED_CHANCE = 0.0021
const MAX_CASES = 20

const FORMS: Arbitration2Form[] = ['binding_arbitration', 'advisory_arbitration', 'mediated_arbitration', 'tribunal_ruling']

export class DiplomaticArbitration2System {
  private cases: Arbitration2Case[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.cases.length < MAX_CASES && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.cases.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        evidenceStrength: 25 + Math.random() * 35,
        arbitratorImpartiality: 30 + Math.random() * 35,
        complianceRate: 20 + Math.random() * 30,
        rulingFairness: 15 + Math.random() * 30,
        duration: 0,
        tick,
      })
    }

    for (const c of this.cases) {
      c.duration += 1
      c.evidenceStrength = Math.max(10, Math.min(85, c.evidenceStrength + (Math.random() - 0.47) * 0.11))
      c.arbitratorImpartiality = Math.max(15, Math.min(90, c.arbitratorImpartiality + (Math.random() - 0.5) * 0.10))
      c.complianceRate = Math.max(10, Math.min(80, c.complianceRate + (Math.random() - 0.46) * 0.12))
      c.rulingFairness = Math.max(5, Math.min(75, c.rulingFairness + (Math.random() - 0.48) * 0.09))
    }

    const cutoff = tick - 89000
    for (let i = this.cases.length - 1; i >= 0; i--) {
      if (this.cases[i].tick < cutoff) this.cases.splice(i, 1)
    }
  }

}
