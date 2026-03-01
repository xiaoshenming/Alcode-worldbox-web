// Diplomatic Condonation System (v3.412) - Condonation policies
// Tacit acceptance or overlooking of past offenses to maintain relations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type CondonationForm = 'offense_overlooking' | 'violation_acceptance' | 'transgression_tolerance' | 'breach_forgetting'

export interface CondonationPolicy {
  id: number
  civIdA: number
  civIdB: number
  form: CondonationForm
  pragmatism: number
  moralCost: number
  stabilityBenefit: number
  publicAwareness: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2430
const POLICY_CHANCE = 0.0024
const MAX_POLICIES = 20

const FORMS: CondonationForm[] = ['offense_overlooking', 'violation_acceptance', 'transgression_tolerance', 'breach_forgetting']

export class DiplomaticCondonationSystem {
  private policies: CondonationPolicy[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.policies.length < MAX_POLICIES && Math.random() < POLICY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.policies.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        pragmatism: 30 + Math.random() * 35,
        moralCost: 10 + Math.random() * 25,
        stabilityBenefit: 20 + Math.random() * 30,
        publicAwareness: 5 + Math.random() * 20,
        duration: 0,
        tick,
      })
    }

    for (const p of this.policies) {
      p.duration += 1
      p.pragmatism = Math.max(15, Math.min(85, p.pragmatism + (Math.random() - 0.47) * 0.11))
      p.moralCost = Math.max(5, Math.min(60, p.moralCost + (Math.random() - 0.5) * 0.10))
      p.stabilityBenefit = Math.max(10, Math.min(75, p.stabilityBenefit + (Math.random() - 0.46) * 0.10))
      p.publicAwareness = Math.max(0, Math.min(50, p.publicAwareness + (Math.random() - 0.42) * 0.08))
    }

    const cutoff = tick - 86000
    for (let i = this.policies.length - 1; i >= 0; i--) {
      if (this.policies[i].tick < cutoff) this.policies.splice(i, 1)
    }
  }

}
