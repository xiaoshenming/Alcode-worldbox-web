// Diplomatic Harbinger System (v3.640) - Harbinger governance
// Royal harbingers arranging lodgings and provisions for traveling courts

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type HarbingerForm = 'royal_harbinger' | 'military_harbinger' | 'diplomatic_harbinger' | 'ecclesiastical_harbinger'

export interface HarbingerArrangement {
  id: number
  courtCivId: number
  harbingerCivId: number
  form: HarbingerForm
  lodgingArrangement: number
  routePlanning: number
  provisionSecurity: number
  advanceIntelligence: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2810
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: HarbingerForm[] = ['royal_harbinger', 'military_harbinger', 'diplomatic_harbinger', 'ecclesiastical_harbinger']

export class DiplomaticHarbingerSystem {
  private arrangements: HarbingerArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const court = 1 + Math.floor(Math.random() * 8)
      const harbinger = 1 + Math.floor(Math.random() * 8)
      if (court === harbinger) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        courtCivId: court,
        harbingerCivId: harbinger,
        form,
        lodgingArrangement: 20 + Math.random() * 40,
        routePlanning: 25 + Math.random() * 35,
        provisionSecurity: 10 + Math.random() * 30,
        advanceIntelligence: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.lodgingArrangement = Math.max(5, Math.min(85, a.lodgingArrangement + (Math.random() - 0.48) * 0.12))
      a.routePlanning = Math.max(10, Math.min(90, a.routePlanning + (Math.random() - 0.5) * 0.11))
      a.provisionSecurity = Math.max(5, Math.min(80, a.provisionSecurity + (Math.random() - 0.42) * 0.13))
      a.advanceIntelligence = Math.max(5, Math.min(65, a.advanceIntelligence + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): HarbingerArrangement[] { return this.arrangements }
}
