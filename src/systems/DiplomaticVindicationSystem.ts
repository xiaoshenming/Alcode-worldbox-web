// Diplomatic Vindication System (v3.415) - Vindication proceedings
// Formal justification or defense of actions taken by civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type VindicationForm = 'war_justification' | 'policy_defense' | 'action_legitimization' | 'honor_restoration'

export interface VindicationProceeding {
  id: number
  civIdA: number
  civIdB: number
  form: VindicationForm
  argumentStrength: number
  publicConviction: number
  moralStanding: number
  historicalRecord: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2450
const PROCEED_CHANCE = 0.0024
const MAX_PROCEEDINGS = 20

const FORMS: VindicationForm[] = ['war_justification', 'policy_defense', 'action_legitimization', 'honor_restoration']

export class DiplomaticVindicationSystem {
  private proceedings: VindicationProceeding[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.proceedings.length < MAX_PROCEEDINGS && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.proceedings.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        argumentStrength: 25 + Math.random() * 40,
        publicConviction: 20 + Math.random() * 35,
        moralStanding: 15 + Math.random() * 30,
        historicalRecord: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const p of this.proceedings) {
      p.duration += 1
      p.argumentStrength = Math.max(10, Math.min(90, p.argumentStrength + (Math.random() - 0.47) * 0.12))
      p.publicConviction = Math.max(10, Math.min(85, p.publicConviction + (Math.random() - 0.5) * 0.11))
      p.moralStanding = Math.max(5, Math.min(75, p.moralStanding + (Math.random() - 0.45) * 0.10))
      p.historicalRecord = Math.max(5, Math.min(65, p.historicalRecord + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 87000
    for (let i = this.proceedings.length - 1; i >= 0; i--) {
      if (this.proceedings[i].tick < cutoff) this.proceedings.splice(i, 1)
    }
  }

}
