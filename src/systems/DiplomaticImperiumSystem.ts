// Diplomatic Imperium System (v3.526) - Imperial authority
// Supreme command structures where one civilization holds imperial power over others

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ImperiumForm = 'military_imperium' | 'economic_imperium' | 'religious_imperium' | 'cultural_imperium'

export interface ImperiumRelation {
  id: number
  imperatorCivId: number
  subjectCivId: number
  form: ImperiumForm
  commandAuthority: number
  obedienceLevel: number
  rebellionRisk: number
  imperialBenefit: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2580
const PROCEED_CHANCE = 0.0020
const MAX_RELATIONS = 14

const FORMS: ImperiumForm[] = ['military_imperium', 'economic_imperium', 'religious_imperium', 'cultural_imperium']

export class DiplomaticImperiumSystem {
  private relations: ImperiumRelation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.relations.length < MAX_RELATIONS && Math.random() < PROCEED_CHANCE) {
      const imperator = 1 + Math.floor(Math.random() * 8)
      const subject = 1 + Math.floor(Math.random() * 8)
      if (imperator === subject) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.relations.push({
        id: this.nextId++,
        imperatorCivId: imperator,
        subjectCivId: subject,
        form,
        commandAuthority: 30 + Math.random() * 40,
        obedienceLevel: 20 + Math.random() * 35,
        rebellionRisk: 10 + Math.random() * 30,
        imperialBenefit: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const r of this.relations) {
      r.duration += 1
      r.commandAuthority = Math.max(10, Math.min(90, r.commandAuthority + (Math.random() - 0.48) * 0.13))
      r.obedienceLevel = Math.max(10, Math.min(85, r.obedienceLevel + (Math.random() - 0.5) * 0.11))
      r.rebellionRisk = Math.max(5, Math.min(80, r.rebellionRisk + (Math.random() - 0.42) * 0.12))
      r.imperialBenefit = Math.max(5, Math.min(70, r.imperialBenefit + (Math.random() - 0.46) * 0.10))
    }

    const cutoff = tick - 87000
    for (let i = this.relations.length - 1; i >= 0; i--) {
      if (this.relations[i].tick < cutoff) this.relations.splice(i, 1)
    }
  }

  getRelations(): ImperiumRelation[] { return this.relations }
}
