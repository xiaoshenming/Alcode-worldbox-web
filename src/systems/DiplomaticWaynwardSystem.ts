// Diplomatic Waynward System (v3.673) - Waynward governance
// Officers managing road maintenance and travel routes between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type WaynwardForm = 'royal_waynward' | 'shire_waynward' | 'borough_waynward' | 'turnpike_waynward'

export interface WaynwardArrangement {
  id: number
  roadCivId: number
  travelCivId: number
  form: WaynwardForm
  roadJurisdiction: number
  maintenanceDuty: number
  tollCollection: number
  routeSafety: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2880
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: WaynwardForm[] = ['royal_waynward', 'shire_waynward', 'borough_waynward', 'turnpike_waynward']

export class DiplomaticWaynwardSystem {
  private arrangements: WaynwardArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const road = 1 + Math.floor(Math.random() * 8)
      const travel = 1 + Math.floor(Math.random() * 8)
      if (road === travel) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        roadCivId: road,
        travelCivId: travel,
        form,
        roadJurisdiction: 20 + Math.random() * 40,
        maintenanceDuty: 25 + Math.random() * 35,
        tollCollection: 10 + Math.random() * 30,
        routeSafety: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.roadJurisdiction = Math.max(5, Math.min(85, a.roadJurisdiction + (Math.random() - 0.48) * 0.12))
      a.maintenanceDuty = Math.max(10, Math.min(90, a.maintenanceDuty + (Math.random() - 0.5) * 0.11))
      a.tollCollection = Math.max(5, Math.min(80, a.tollCollection + (Math.random() - 0.42) * 0.13))
      a.routeSafety = Math.max(5, Math.min(65, a.routeSafety + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): WaynwardArrangement[] { return this.arrangements }
}
