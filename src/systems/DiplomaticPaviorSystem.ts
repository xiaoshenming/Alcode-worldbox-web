// Diplomatic Pavior System (v3.721) - Pavior governance
// Officers overseeing road paving and street maintenance between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type PaviorForm = 'royal_pavior' | 'borough_pavior' | 'guild_pavior' | 'highway_pavior'

export interface PaviorArrangement {
  id: number
  roadCivId: number
  maintenanceCivId: number
  form: PaviorForm
  roadAuthority: number
  pavingQuality: number
  tollCollection: number
  repairSchedule: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 3040
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: PaviorForm[] = ['royal_pavior', 'borough_pavior', 'guild_pavior', 'highway_pavior']

export class DiplomaticPaviorSystem {
  private arrangements: PaviorArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const road = 1 + Math.floor(Math.random() * 8)
      const maintenance = 1 + Math.floor(Math.random() * 8)
      if (road === maintenance) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        roadCivId: road,
        maintenanceCivId: maintenance,
        form,
        roadAuthority: 20 + Math.random() * 40,
        pavingQuality: 25 + Math.random() * 35,
        tollCollection: 10 + Math.random() * 30,
        repairSchedule: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.roadAuthority = Math.max(5, Math.min(85, a.roadAuthority + (Math.random() - 0.48) * 0.12))
      a.pavingQuality = Math.max(10, Math.min(90, a.pavingQuality + (Math.random() - 0.5) * 0.11))
      a.tollCollection = Math.max(5, Math.min(80, a.tollCollection + (Math.random() - 0.42) * 0.13))
      a.repairSchedule = Math.max(5, Math.min(65, a.repairSchedule + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): PaviorArrangement[] { return this.arrangements }
}
