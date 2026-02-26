// Diplomatic Ranger System (v3.667) - Ranger governance
// Officers patrolling and protecting frontier lands between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type RangerForm = 'royal_ranger' | 'border_ranger' | 'forest_ranger' | 'highland_ranger'

export interface RangerArrangement {
  id: number
  frontierCivId: number
  patrolCivId: number
  form: RangerForm
  patrolJurisdiction: number
  borderSecurity: number
  wildernessKnowledge: number
  scoutingRange: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2860
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: RangerForm[] = ['royal_ranger', 'border_ranger', 'forest_ranger', 'highland_ranger']

export class DiplomaticRangerSystem {
  private arrangements: RangerArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const frontier = 1 + Math.floor(Math.random() * 8)
      const patrol = 1 + Math.floor(Math.random() * 8)
      if (frontier === patrol) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        frontierCivId: frontier,
        patrolCivId: patrol,
        form,
        patrolJurisdiction: 20 + Math.random() * 40,
        borderSecurity: 25 + Math.random() * 35,
        wildernessKnowledge: 10 + Math.random() * 30,
        scoutingRange: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.patrolJurisdiction = Math.max(5, Math.min(85, a.patrolJurisdiction + (Math.random() - 0.48) * 0.12))
      a.borderSecurity = Math.max(10, Math.min(90, a.borderSecurity + (Math.random() - 0.5) * 0.11))
      a.wildernessKnowledge = Math.max(5, Math.min(80, a.wildernessKnowledge + (Math.random() - 0.42) * 0.13))
      a.scoutingRange = Math.max(5, Math.min(65, a.scoutingRange + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): RangerArrangement[] { return this.arrangements }
}
