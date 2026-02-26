// Diplomatic Stewardship Pact System (v3.550) - Stewardship pact agreements
// Formal pacts where civilizations agree to steward shared resources

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type StewardshipPactForm = 'land_stewardship' | 'water_stewardship' | 'forest_stewardship' | 'mineral_stewardship'

export interface StewardshipPactArrangement {
  id: number
  stewardCivId: number
  partnerCivId: number
  form: StewardshipPactForm
  resourceCare: number
  sharedBenefit: number
  complianceRate: number
  sustainabilityScore: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2590
const PROCEED_CHANCE = 0.0020
const MAX_ARRANGEMENTS = 16

const FORMS: StewardshipPactForm[] = ['land_stewardship', 'water_stewardship', 'forest_stewardship', 'mineral_stewardship']

export class DiplomaticStewardshipPactSystem {
  private arrangements: StewardshipPactArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const steward = 1 + Math.floor(Math.random() * 8)
      const partner = 1 + Math.floor(Math.random() * 8)
      if (steward === partner) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        stewardCivId: steward,
        partnerCivId: partner,
        form,
        resourceCare: 20 + Math.random() * 40,
        sharedBenefit: 25 + Math.random() * 35,
        complianceRate: 10 + Math.random() * 30,
        sustainabilityScore: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.resourceCare = Math.max(5, Math.min(85, a.resourceCare + (Math.random() - 0.48) * 0.12))
      a.sharedBenefit = Math.max(10, Math.min(90, a.sharedBenefit + (Math.random() - 0.5) * 0.11))
      a.complianceRate = Math.max(5, Math.min(80, a.complianceRate + (Math.random() - 0.42) * 0.13))
      a.sustainabilityScore = Math.max(5, Math.min(65, a.sustainabilityScore + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): StewardshipPactArrangement[] { return this.arrangements }
}
