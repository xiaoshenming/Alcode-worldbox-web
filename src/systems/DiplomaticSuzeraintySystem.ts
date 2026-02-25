// Diplomatic Suzerainty System (v3.514) - Suzerainty relations
// Hierarchical diplomatic relationships with overlord-vassal dynamics

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type SuzeraintyForm = 'tributary_obligation' | 'military_service' | 'political_deference' | 'economic_tribute'

export interface SuzeraintyRelation {
  id: number
  suzerainCivId: number
  vassalCivId: number
  form: SuzeraintyForm
  authorityLevel: number
  tributeRate: number
  loyaltyIndex: number
  protectionValue: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2540
const PROCEED_CHANCE = 0.0021
const MAX_RELATIONS = 16

const FORMS: SuzeraintyForm[] = ['tributary_obligation', 'military_service', 'political_deference', 'economic_tribute']

export class DiplomaticSuzeraintySystem {
  private relations: SuzeraintyRelation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.relations.length < MAX_RELATIONS && Math.random() < PROCEED_CHANCE) {
      const suzerain = 1 + Math.floor(Math.random() * 8)
      const vassal = 1 + Math.floor(Math.random() * 8)
      if (suzerain === vassal) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.relations.push({
        id: this.nextId++,
        suzerainCivId: suzerain,
        vassalCivId: vassal,
        form,
        authorityLevel: 25 + Math.random() * 40,
        tributeRate: 15 + Math.random() * 30,
        loyaltyIndex: 20 + Math.random() * 35,
        protectionValue: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const r of this.relations) {
      r.duration += 1
      r.authorityLevel = Math.max(10, Math.min(90, r.authorityLevel + (Math.random() - 0.47) * 0.12))
      r.tributeRate = Math.max(5, Math.min(70, r.tributeRate + (Math.random() - 0.5) * 0.10))
      r.loyaltyIndex = Math.max(10, Math.min(85, r.loyaltyIndex + (Math.random() - 0.45) * 0.11))
      r.protectionValue = Math.max(5, Math.min(65, r.protectionValue + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 90000
    for (let i = this.relations.length - 1; i >= 0; i--) {
      if (this.relations[i].tick < cutoff) this.relations.splice(i, 1)
    }
  }

  getRelations(): SuzeraintyRelation[] { return this.relations }
}
