// Diplomatic Procuratorship System (v3.559) - Procuratorial governance
// Civilizations appointing procurators to govern distant territories

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ProcuratorshipForm = 'provincial_procurator' | 'fiscal_procurator' | 'judicial_procurator' | 'military_procurator'

export interface ProcuratorshipArrangement {
  id: number
  appointerCivId: number
  governedCivId: number
  form: ProcuratorshipForm
  administrativeReach: number
  taxCollection: number
  localCompliance: number
  corruptionRisk: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2580
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: ProcuratorshipForm[] = ['provincial_procurator', 'fiscal_procurator', 'judicial_procurator', 'military_procurator']

export class DiplomaticProcuratorshipSystem {
  private arrangements: ProcuratorshipArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const appointer = 1 + Math.floor(Math.random() * 8)
      const governed = 1 + Math.floor(Math.random() * 8)
      if (appointer === governed) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        appointerCivId: appointer,
        governedCivId: governed,
        form,
        administrativeReach: 20 + Math.random() * 40,
        taxCollection: 25 + Math.random() * 35,
        localCompliance: 10 + Math.random() * 30,
        corruptionRisk: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.administrativeReach = Math.max(5, Math.min(85, a.administrativeReach + (Math.random() - 0.48) * 0.12))
      a.taxCollection = Math.max(10, Math.min(90, a.taxCollection + (Math.random() - 0.5) * 0.11))
      a.localCompliance = Math.max(5, Math.min(80, a.localCompliance + (Math.random() - 0.42) * 0.13))
      a.corruptionRisk = Math.max(5, Math.min(65, a.corruptionRisk + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
