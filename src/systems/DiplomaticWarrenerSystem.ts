// Diplomatic Warrener System (v3.658) - Warrener governance
// Officers managing rabbit warrens and small game preserves between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type WarrenerForm = 'royal_warrener' | 'manor_warrener' | 'chase_warrener' | 'park_warrener'

export interface WarrenerArrangement {
  id: number
  warrenCivId: number
  preserveCivId: number
  form: WarrenerForm
  warrenJurisdiction: number
  gameRights: number
  breedingManagement: number
  harvestQuota: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2830
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: WarrenerForm[] = ['royal_warrener', 'manor_warrener', 'chase_warrener', 'park_warrener']

export class DiplomaticWarrenerSystem {
  private arrangements: WarrenerArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const warren = 1 + Math.floor(Math.random() * 8)
      const preserve = 1 + Math.floor(Math.random() * 8)
      if (warren === preserve) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        warrenCivId: warren,
        preserveCivId: preserve,
        form,
        warrenJurisdiction: 20 + Math.random() * 40,
        gameRights: 25 + Math.random() * 35,
        breedingManagement: 10 + Math.random() * 30,
        harvestQuota: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.warrenJurisdiction = Math.max(5, Math.min(85, a.warrenJurisdiction + (Math.random() - 0.48) * 0.12))
      a.gameRights = Math.max(10, Math.min(90, a.gameRights + (Math.random() - 0.5) * 0.11))
      a.breedingManagement = Math.max(5, Math.min(80, a.breedingManagement + (Math.random() - 0.42) * 0.13))
      a.harvestQuota = Math.max(5, Math.min(65, a.harvestQuota + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): WarrenerArrangement[] { return this.arrangements }
}
