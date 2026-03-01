// Diplomatic Grithman System (v3.688) - Grithman governance
// Officers maintaining sanctuary and peace zones between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type GrithmanForm = 'royal_grithman' | 'church_grithman' | 'market_grithman' | 'court_grithman'

export interface GrithmanArrangement {
  id: number
  sanctuaryCivId: number
  peaceCivId: number
  form: GrithmanForm
  sanctuaryAuthority: number
  peaceEnforcement: number
  asylumRights: number
  trucePeriod: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2930
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: GrithmanForm[] = ['royal_grithman', 'church_grithman', 'market_grithman', 'court_grithman']

export class DiplomaticGrithmanSystem {
  private arrangements: GrithmanArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const sanctuary = 1 + Math.floor(Math.random() * 8)
      const peace = 1 + Math.floor(Math.random() * 8)
      if (sanctuary === peace) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        sanctuaryCivId: sanctuary,
        peaceCivId: peace,
        form,
        sanctuaryAuthority: 20 + Math.random() * 40,
        peaceEnforcement: 25 + Math.random() * 35,
        asylumRights: 10 + Math.random() * 30,
        trucePeriod: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.sanctuaryAuthority = Math.max(5, Math.min(85, a.sanctuaryAuthority + (Math.random() - 0.48) * 0.12))
      a.peaceEnforcement = Math.max(10, Math.min(90, a.peaceEnforcement + (Math.random() - 0.5) * 0.11))
      a.asylumRights = Math.max(5, Math.min(80, a.asylumRights + (Math.random() - 0.42) * 0.13))
      a.trucePeriod = Math.max(5, Math.min(65, a.trucePeriod + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
