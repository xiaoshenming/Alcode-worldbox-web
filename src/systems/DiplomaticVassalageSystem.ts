// Diplomatic Vassalage System (v3.520) - Vassalage relations
// Feudal-style diplomatic bonds between lord civilizations and vassal states

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type VassalageForm = 'military_fealty' | 'economic_servitude' | 'political_allegiance' | 'territorial_concession'

export interface VassalageRelation {
  id: number
  lordCivId: number
  vassalCivId: number
  form: VassalageForm
  fealtyLevel: number
  tributeObligation: number
  protectionGuarantee: number
  autonomyAllowed: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2570
const PROCEED_CHANCE = 0.0020
const MAX_RELATIONS = 16

const FORMS: VassalageForm[] = ['military_fealty', 'economic_servitude', 'political_allegiance', 'territorial_concession']

export class DiplomaticVassalageSystem {
  private relations: VassalageRelation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.relations.length < MAX_RELATIONS && Math.random() < PROCEED_CHANCE) {
      const lord = 1 + Math.floor(Math.random() * 8)
      const vassal = 1 + Math.floor(Math.random() * 8)
      if (lord === vassal) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.relations.push({
        id: this.nextId++,
        lordCivId: lord,
        vassalCivId: vassal,
        form,
        fealtyLevel: 25 + Math.random() * 40,
        tributeObligation: 15 + Math.random() * 30,
        protectionGuarantee: 20 + Math.random() * 35,
        autonomyAllowed: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const r of this.relations) {
      r.duration += 1
      r.fealtyLevel = Math.max(10, Math.min(90, r.fealtyLevel + (Math.random() - 0.47) * 0.12))
      r.tributeObligation = Math.max(5, Math.min(70, r.tributeObligation + (Math.random() - 0.5) * 0.10))
      r.protectionGuarantee = Math.max(10, Math.min(85, r.protectionGuarantee + (Math.random() - 0.45) * 0.11))
      r.autonomyAllowed = Math.max(5, Math.min(65, r.autonomyAllowed + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 91000
    for (let i = this.relations.length - 1; i >= 0; i--) {
      if (this.relations[i].tick < cutoff) this.relations.splice(i, 1)
    }
  }

}
