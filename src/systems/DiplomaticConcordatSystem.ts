// Diplomatic Concordat System (v3.481) - Concordat agreements
// Formal binding agreements between civilizations on specific matters

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ConcordatForm = 'territorial_concordat' | 'trade_concordat' | 'cultural_concordat' | 'military_concordat'

export interface ConcordatProceeding {
  id: number
  civIdA: number
  civIdB: number
  form: ConcordatForm
  bindingStrength: number
  complianceRate: number
  mutualObligation: number
  enforcementLevel: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2510
const PROCEED_CHANCE = 0.0022
const MAX_PROCEEDINGS = 19

const FORMS: ConcordatForm[] = ['territorial_concordat', 'trade_concordat', 'cultural_concordat', 'military_concordat']

export class DiplomaticConcordatSystem {
  private proceedings: ConcordatProceeding[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.proceedings.length < MAX_PROCEEDINGS && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.proceedings.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        bindingStrength: 25 + Math.random() * 40,
        complianceRate: 20 + Math.random() * 35,
        mutualObligation: 15 + Math.random() * 30,
        enforcementLevel: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const p of this.proceedings) {
      p.duration += 1
      p.bindingStrength = Math.max(10, Math.min(90, p.bindingStrength + (Math.random() - 0.47) * 0.12))
      p.complianceRate = Math.max(10, Math.min(85, p.complianceRate + (Math.random() - 0.5) * 0.11))
      p.mutualObligation = Math.max(5, Math.min(75, p.mutualObligation + (Math.random() - 0.45) * 0.10))
      p.enforcementLevel = Math.max(5, Math.min(65, p.enforcementLevel + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 89000
    for (let i = this.proceedings.length - 1; i >= 0; i--) {
      if (this.proceedings[i].tick < cutoff) this.proceedings.splice(i, 1)
    }
  }

  getProceedings(): ConcordatProceeding[] { return this.proceedings }
}
