// Diplomatic Almoner System (v3.634) - Almoner governance
// Royal almoners distributing charity and managing poor relief between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AlmonerForm = 'royal_almoner' | 'ecclesiastical_almoner' | 'municipal_almoner' | 'guild_almoner'

export interface AlmonerArrangement {
  id: number
  patronCivId: number
  almonerCivId: number
  form: AlmonerForm
  charityDistribution: number
  poorRelief: number
  hospitalManagement: number
  almsCollection: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2790
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: AlmonerForm[] = ['royal_almoner', 'ecclesiastical_almoner', 'municipal_almoner', 'guild_almoner']

export class DiplomaticAlmonerSystem {
  private arrangements: AlmonerArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const patron = 1 + Math.floor(Math.random() * 8)
      const almoner = 1 + Math.floor(Math.random() * 8)
      if (patron === almoner) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        patronCivId: patron,
        almonerCivId: almoner,
        form,
        charityDistribution: 20 + Math.random() * 40,
        poorRelief: 25 + Math.random() * 35,
        hospitalManagement: 10 + Math.random() * 30,
        almsCollection: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.charityDistribution = Math.max(5, Math.min(85, a.charityDistribution + (Math.random() - 0.48) * 0.12))
      a.poorRelief = Math.max(10, Math.min(90, a.poorRelief + (Math.random() - 0.5) * 0.11))
      a.hospitalManagement = Math.max(5, Math.min(80, a.hospitalManagement + (Math.random() - 0.42) * 0.13))
      a.almsCollection = Math.max(5, Math.min(65, a.almsCollection + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
