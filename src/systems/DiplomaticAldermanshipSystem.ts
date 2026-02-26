// Diplomatic Aldermanship System (v3.604) - Alderman governance
// Senior aldermen presiding over wards and councils between territories

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AldermanshipForm = 'ward_aldermanship' | 'guild_aldermanship' | 'borough_aldermanship' | 'county_aldermanship'

export interface AldermanshipArrangement {
  id: number
  councilCivId: number
  aldermanCivId: number
  form: AldermanshipForm
  wardPresidency: number
  councilInfluence: number
  tradeRegulation: number
  judicialRole: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2730
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: AldermanshipForm[] = ['ward_aldermanship', 'guild_aldermanship', 'borough_aldermanship', 'county_aldermanship']

export class DiplomaticAldermanshipSystem {
  private arrangements: AldermanshipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const council = 1 + Math.floor(Math.random() * 8)
      const alderman = 1 + Math.floor(Math.random() * 8)
      if (council === alderman) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        councilCivId: council,
        aldermanCivId: alderman,
        form,
        wardPresidency: 20 + Math.random() * 40,
        councilInfluence: 25 + Math.random() * 35,
        tradeRegulation: 10 + Math.random() * 30,
        judicialRole: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.wardPresidency = Math.max(5, Math.min(85, a.wardPresidency + (Math.random() - 0.48) * 0.12))
      a.councilInfluence = Math.max(10, Math.min(90, a.councilInfluence + (Math.random() - 0.5) * 0.11))
      a.tradeRegulation = Math.max(5, Math.min(80, a.tradeRegulation + (Math.random() - 0.42) * 0.13))
      a.judicialRole = Math.max(5, Math.min(65, a.judicialRole + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): AldermanshipArrangement[] { return this.arrangements }
}
