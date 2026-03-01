// Diplomatic Appeasement System (v3.346) - Appeasement policies
// Strategic concessions to maintain peace and avoid conflict escalation

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type AppeasementType = 'territorial' | 'economic' | 'military' | 'symbolic'

export interface AppeasementPolicy {
  id: number
  civIdA: number
  civIdB: number
  appeasementType: AppeasementType
  concessionLevel: number
  peaceStability: number
  publicOpinion: number
  longTermRisk: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2390
const TREATY_CHANCE = 0.0025
const MAX_POLICIES = 20

const TYPES: AppeasementType[] = ['territorial', 'economic', 'military', 'symbolic']

export class DiplomaticAppeasementSystem {
  private policies: AppeasementPolicy[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.policies.length < MAX_POLICIES && Math.random() < TREATY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const aType = TYPES[Math.floor(Math.random() * TYPES.length)]

      this.policies.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        appeasementType: aType,
        concessionLevel: 15 + Math.random() * 35,
        peaceStability: 20 + Math.random() * 30,
        publicOpinion: 25 + Math.random() * 40,
        longTermRisk: 10 + Math.random() * 30,
        duration: 0,
        tick,
      })
    }

    for (const p of this.policies) {
      p.duration += 1
      p.concessionLevel = Math.max(5, Math.min(80, p.concessionLevel + (Math.random() - 0.47) * 0.12))
      p.peaceStability = Math.max(10, Math.min(85, p.peaceStability + (Math.random() - 0.46) * 0.11))
      p.publicOpinion = Math.max(10, Math.min(90, p.publicOpinion + (Math.random() - 0.5) * 0.14))
      p.longTermRisk = Math.max(5, Math.min(70, p.longTermRisk + (Math.random() - 0.45) * 0.1))
    }

    const cutoff = tick - 80000
    for (let i = this.policies.length - 1; i >= 0; i--) {
      if (this.policies[i].tick < cutoff) this.policies.splice(i, 1)
    }
  }

}
