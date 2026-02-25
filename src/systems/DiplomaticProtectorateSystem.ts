// Diplomatic Protectorate System (v3.493) - Protectorate relations
// Formal protection agreements where stronger civilizations shield weaker ones

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ProtectorateForm = 'military_shield' | 'economic_patronage' | 'cultural_guardianship' | 'territorial_guarantee'

export interface ProtectorateRelation {
  id: number
  civIdA: number
  civIdB: number
  form: ProtectorateForm
  protectionStrength: number
  autonomyLevel: number
  tributeRate: number
  loyaltyBond: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2530
const PROCEED_CHANCE = 0.0021
const MAX_RELATIONS = 17

const FORMS: ProtectorateForm[] = ['military_shield', 'economic_patronage', 'cultural_guardianship', 'territorial_guarantee']

export class DiplomaticProtectorateSystem {
  private relations: ProtectorateRelation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.relations.length < MAX_RELATIONS && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.relations.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        protectionStrength: 25 + Math.random() * 40,
        autonomyLevel: 20 + Math.random() * 35,
        tributeRate: 15 + Math.random() * 30,
        loyaltyBond: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const r of this.relations) {
      r.duration += 1
      r.protectionStrength = Math.max(10, Math.min(90, r.protectionStrength + (Math.random() - 0.47) * 0.12))
      r.autonomyLevel = Math.max(10, Math.min(85, r.autonomyLevel + (Math.random() - 0.5) * 0.11))
      r.tributeRate = Math.max(5, Math.min(75, r.tributeRate + (Math.random() - 0.45) * 0.10))
      r.loyaltyBond = Math.max(5, Math.min(65, r.loyaltyBond + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 93000
    for (let i = this.relations.length - 1; i >= 0; i--) {
      if (this.relations[i].tick < cutoff) this.relations.splice(i, 1)
    }
  }

  getRelations(): ProtectorateRelation[] { return this.relations }
}
