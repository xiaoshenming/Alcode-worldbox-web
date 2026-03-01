// Diplomatic Mitigation System (v3.409) - Mitigation measures
// Actions taken to reduce the severity of diplomatic conflicts or penalties

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MitigationForm = 'conflict_deescalation' | 'damage_limitation' | 'tension_reduction' | 'crisis_management'

export interface MitigationMeasure {
  id: number
  civIdA: number
  civIdB: number
  form: MitigationForm
  effectiveness: number
  costOfAction: number
  tensionReduction: number
  longTermBenefit: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2410
const MEASURE_CHANCE = 0.0025
const MAX_MEASURES = 20

const FORMS: MitigationForm[] = ['conflict_deescalation', 'damage_limitation', 'tension_reduction', 'crisis_management']

export class DiplomaticMitigationSystem {
  private measures: MitigationMeasure[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.measures.length < MAX_MEASURES && Math.random() < MEASURE_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.measures.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        effectiveness: 25 + Math.random() * 40,
        costOfAction: 15 + Math.random() * 30,
        tensionReduction: 20 + Math.random() * 35,
        longTermBenefit: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const m of this.measures) {
      m.duration += 1
      m.effectiveness = Math.max(10, Math.min(85, m.effectiveness + (Math.random() - 0.47) * 0.12))
      m.tensionReduction = Math.max(10, Math.min(80, m.tensionReduction + (Math.random() - 0.5) * 0.11))
      m.longTermBenefit = Math.max(5, Math.min(70, m.longTermBenefit + (Math.random() - 0.45) * 0.10))
      m.costOfAction = Math.max(5, Math.min(60, m.costOfAction + (Math.random() - 0.44) * 0.08))
    }

    const cutoff = tick - 83000
    for (let i = this.measures.length - 1; i >= 0; i--) {
      if (this.measures[i].tick < cutoff) this.measures.splice(i, 1)
    }
  }

}
