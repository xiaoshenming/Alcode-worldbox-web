// Diplomatic Commutation System (v3.406) - Commutation of sentences
// Reduction of diplomatic penalties or punishments to lesser forms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type CommutationForm = 'penalty_reduction' | 'exile_to_restriction' | 'blockade_to_tariff' | 'war_to_cold_peace'

export interface CommutationAct {
  id: number
  civIdA: number
  civIdB: number
  form: CommutationForm
  severityReduction: number
  fairnessPerception: number
  stabilityGain: number
  precedentEffect: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2390
const ACT_CHANCE = 0.0025
const MAX_ACTS = 20

const FORMS: CommutationForm[] = ['penalty_reduction', 'exile_to_restriction', 'blockade_to_tariff', 'war_to_cold_peace']

export class DiplomaticCommutationSystem {
  private acts: CommutationAct[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.acts.length < MAX_ACTS && Math.random() < ACT_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.acts.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        severityReduction: 25 + Math.random() * 40,
        fairnessPerception: 20 + Math.random() * 35,
        stabilityGain: 15 + Math.random() * 30,
        precedentEffect: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.acts) {
      a.duration += 1
      a.severityReduction = Math.max(10, Math.min(85, a.severityReduction + (Math.random() - 0.47) * 0.12))
      a.fairnessPerception = Math.max(10, Math.min(80, a.fairnessPerception + (Math.random() - 0.5) * 0.11))
      a.stabilityGain = Math.max(5, Math.min(75, a.stabilityGain + (Math.random() - 0.46) * 0.10))
      a.precedentEffect = Math.max(5, Math.min(65, a.precedentEffect + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 84000
    for (let i = this.acts.length - 1; i >= 0; i--) {
      if (this.acts[i].tick < cutoff) this.acts.splice(i, 1)
    }
  }

  getActs(): CommutationAct[] { return this.acts }
}
