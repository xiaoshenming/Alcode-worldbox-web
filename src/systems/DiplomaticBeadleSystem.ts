// Diplomatic Beadle System (v3.709) - Beadle governance
// Officers serving as parish constables and church wardens between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type BeadleForm = 'royal_beadle' | 'parish_beadle' | 'church_beadle' | 'university_beadle'

export interface BeadleArrangement {
  id: number
  parishCivId: number
  wardenCivId: number
  form: BeadleForm
  parishAuthority: number
  orderKeeping: number
  almsDistribution: number
  ceremonialRole: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3000
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: BeadleForm[] = ['royal_beadle', 'parish_beadle', 'church_beadle', 'university_beadle']

export class DiplomaticBeadleSystem {
  private arrangements: BeadleArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const parish = 1 + Math.floor(Math.random() * 8)
      const warden = 1 + Math.floor(Math.random() * 8)
      if (parish === warden) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        parishCivId: parish,
        wardenCivId: warden,
        form,
        parishAuthority: 20 + Math.random() * 40,
        orderKeeping: 25 + Math.random() * 35,
        almsDistribution: 10 + Math.random() * 30,
        ceremonialRole: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.parishAuthority = Math.max(5, Math.min(85, a.parishAuthority + (Math.random() - 0.48) * 0.12))
      a.orderKeeping = Math.max(10, Math.min(90, a.orderKeeping + (Math.random() - 0.5) * 0.11))
      a.almsDistribution = Math.max(5, Math.min(80, a.almsDistribution + (Math.random() - 0.42) * 0.13))
      a.ceremonialRole = Math.max(5, Math.min(65, a.ceremonialRole + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): BeadleArrangement[] { return this.arrangements }
}
