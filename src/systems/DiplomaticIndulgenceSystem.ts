// Diplomatic Indulgence System (v3.403) - Indulgence grants
// Formal permissions or pardons granted as diplomatic favors

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type IndulgenceForm = 'trade_privilege' | 'border_leniency' | 'tax_exemption' | 'cultural_allowance'

export interface IndulgenceGrant {
  id: number
  civIdA: number
  civIdB: number
  form: IndulgenceForm
  generosity: number
  reciprocalExpectation: number
  politicalLeverage: number
  publicOpinion: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2370
const GRANT_CHANCE = 0.0026
const MAX_GRANTS = 20

const FORMS: IndulgenceForm[] = ['trade_privilege', 'border_leniency', 'tax_exemption', 'cultural_allowance']

export class DiplomaticIndulgenceSystem {
  private grants: IndulgenceGrant[] = []
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
        generosity: 25 + Math.random() * 40,
        reciprocalExpectation: 20 + Math.random() * 35,
        politicalLeverage: 15 + Math.random() * 30,
        publicOpinion: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const g of this.grants) {
      g.duration += 1
      g.generosity = Math.max(10, Math.min(85, g.generosity + (Math.random() - 0.47) * 0.12))
      g.reciprocalExpectation = Math.max(10, Math.min(80, g.reciprocalExpectation + (Math.random() - 0.5) * 0.11))
      g.politicalLeverage = Math.max(5, Math.min(70, g.politicalLeverage + (Math.random() - 0.45) * 0.10))
      g.publicOpinion = Math.max(5, Math.min(65, g.publicOpinion + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 85000
    for (let i = this.grants.length - 1; i >= 0; i--) {
      if (this.grants[i].tick < cutoff) this.grants.splice(i, 1)
    }
  }

  getGrants(): IndulgenceGrant[] { return this.grants }
}
