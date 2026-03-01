// Diplomatic Chancellery System (v3.568) - Chancellery governance
// Chancellors administering diplomatic affairs and state correspondence

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ChancelleryForm = 'royal_chancellery' | 'imperial_chancellery' | 'ecclesiastical_chancellery' | 'municipal_chancellery'

export interface ChancelleryArrangement {
  id: number
  patronCivId: number
  chancellorCivId: number
  form: ChancelleryForm
  administrativePower: number
  diplomaticReach: number
  correspondenceEfficiency: number
  sealAuthority: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2610
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: ChancelleryForm[] = ['royal_chancellery', 'imperial_chancellery', 'ecclesiastical_chancellery', 'municipal_chancellery']

export class DiplomaticChancellerySystem {
  private arrangements: ChancelleryArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const patron = 1 + Math.floor(Math.random() * 8)
      const chancellor = 1 + Math.floor(Math.random() * 8)
      if (patron === chancellor) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        patronCivId: patron,
        chancellorCivId: chancellor,
        form,
        administrativePower: 20 + Math.random() * 40,
        diplomaticReach: 25 + Math.random() * 35,
        correspondenceEfficiency: 10 + Math.random() * 30,
        sealAuthority: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.administrativePower = Math.max(5, Math.min(85, a.administrativePower + (Math.random() - 0.48) * 0.12))
      a.diplomaticReach = Math.max(10, Math.min(90, a.diplomaticReach + (Math.random() - 0.5) * 0.11))
      a.correspondenceEfficiency = Math.max(5, Math.min(80, a.correspondenceEfficiency + (Math.random() - 0.42) * 0.13))
      a.sealAuthority = Math.max(5, Math.min(65, a.sealAuthority + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
