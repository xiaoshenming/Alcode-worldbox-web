// Diplomatic Wainage System (v3.724) - Wainage governance
// Officers managing cart and wagon rights and transport duties between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type WainageForm = 'royal_wainage' | 'manor_wainage' | 'borough_wainage' | 'guild_wainage'

export interface WainageArrangement {
  id: number
  transportCivId: number
  dutyCivId: number
  form: WainageForm
  transportRights: number
  wagonDuty: number
  roadAccess: number
  cartageToll: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3050
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: WainageForm[] = ['royal_wainage', 'manor_wainage', 'borough_wainage', 'guild_wainage']

export class DiplomaticWainageSystem {
  private arrangements: WainageArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const transport = 1 + Math.floor(Math.random() * 8)
      const duty = 1 + Math.floor(Math.random() * 8)
      if (transport === duty) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        transportCivId: transport,
        dutyCivId: duty,
        form,
        transportRights: 20 + Math.random() * 40,
        wagonDuty: 25 + Math.random() * 35,
        roadAccess: 10 + Math.random() * 30,
        cartageToll: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.transportRights = Math.max(5, Math.min(85, a.transportRights + (Math.random() - 0.48) * 0.12))
      a.wagonDuty = Math.max(10, Math.min(90, a.wagonDuty + (Math.random() - 0.5) * 0.11))
      a.roadAccess = Math.max(5, Math.min(80, a.roadAccess + (Math.random() - 0.42) * 0.13))
      a.cartageToll = Math.max(5, Math.min(65, a.cartageToll + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
