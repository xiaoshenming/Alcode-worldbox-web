// Diplomatic Prefecture System (v3.562) - Prefectural governance
// Administrative divisions governed by appointed prefects

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type PrefectureForm = 'civil_prefecture' | 'military_prefecture' | 'judicial_prefecture' | 'fiscal_prefecture'

export interface PrefectureArrangement {
  id: number
  appointerCivId: number
  prefectureCivId: number
  form: PrefectureForm
  administrativeOrder: number
  taxEfficiency: number
  localLoyalty: number
  prefectAuthority: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2590
const PROCEED_CHANCE = 0.0020
const MAX_ARRANGEMENTS = 16

const FORMS: PrefectureForm[] = ['civil_prefecture', 'military_prefecture', 'judicial_prefecture', 'fiscal_prefecture']

export class DiplomaticPrefectureSystem {
  private arrangements: PrefectureArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const appointer = 1 + Math.floor(Math.random() * 8)
      const prefecture = 1 + Math.floor(Math.random() * 8)
      if (appointer === prefecture) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        appointerCivId: appointer,
        prefectureCivId: prefecture,
        form,
        administrativeOrder: 20 + Math.random() * 40,
        taxEfficiency: 25 + Math.random() * 35,
        localLoyalty: 10 + Math.random() * 30,
        prefectAuthority: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.administrativeOrder = Math.max(5, Math.min(85, a.administrativeOrder + (Math.random() - 0.48) * 0.12))
      a.taxEfficiency = Math.max(10, Math.min(90, a.taxEfficiency + (Math.random() - 0.5) * 0.11))
      a.localLoyalty = Math.max(5, Math.min(80, a.localLoyalty + (Math.random() - 0.42) * 0.13))
      a.prefectAuthority = Math.max(5, Math.min(65, a.prefectAuthority + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
