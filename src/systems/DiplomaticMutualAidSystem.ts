// Diplomatic Mutual Aid System (v3.490) - Mutual aid agreements
// Reciprocal assistance pacts between civilizations in times of need

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type MutualAidForm = 'disaster_relief' | 'military_assistance' | 'economic_support' | 'resource_pooling'

export interface MutualAidPact {
  id: number
  civIdA: number
  civIdB: number
  form: MutualAidForm
  reciprocityLevel: number
  responseSpeed: number
  aidCapacity: number
  trustBond: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2520
const PROCEED_CHANCE = 0.0023
const MAX_PACTS = 19

const FORMS: MutualAidForm[] = ['disaster_relief', 'military_assistance', 'economic_support', 'resource_pooling']

export class DiplomaticMutualAidSystem {
  private pacts: MutualAidPact[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.pacts.length < MAX_PACTS && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.pacts.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        reciprocityLevel: 25 + Math.random() * 40,
        responseSpeed: 20 + Math.random() * 35,
        aidCapacity: 15 + Math.random() * 30,
        trustBond: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const p of this.pacts) {
      p.duration += 1
      p.reciprocityLevel = Math.max(10, Math.min(90, p.reciprocityLevel + (Math.random() - 0.47) * 0.12))
      p.responseSpeed = Math.max(10, Math.min(85, p.responseSpeed + (Math.random() - 0.5) * 0.11))
      p.aidCapacity = Math.max(5, Math.min(75, p.aidCapacity + (Math.random() - 0.45) * 0.10))
      p.trustBond = Math.max(5, Math.min(65, p.trustBond + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 92000
    for (let i = this.pacts.length - 1; i >= 0; i--) {
      if (this.pacts[i].tick < cutoff) this.pacts.splice(i, 1)
    }
  }

}
