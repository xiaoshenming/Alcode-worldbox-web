// Diplomatic Reunification System (v3.316) - Reunification treaties
// Agreements to merge previously separated civilizations back together

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ReunificationPhase = 'proposal' | 'negotiation' | 'transition' | 'unified'

export interface ReunificationTreaty {
  id: number
  civIdA: number
  civIdB: number
  phase: ReunificationPhase
  populationSupport: number
  economicAlignment: number
  culturalHarmony: number
  politicalWill: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2550
const TREATY_CHANCE = 0.0028
const MAX_TREATIES = 18

const PHASES: ReunificationPhase[] = ['proposal', 'negotiation', 'transition', 'unified']

export class DiplomaticReunificationSystem {
  private treaties: ReunificationTreaty[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.treaties.length < MAX_TREATIES && Math.random() < TREATY_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const phase = PHASES[Math.floor(Math.random() * PHASES.length)]

      this.treaties.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        phase,
        populationSupport: 25 + Math.random() * 40,
        economicAlignment: 15 + Math.random() * 35,
        culturalHarmony: 20 + Math.random() * 30,
        politicalWill: 30 + Math.random() * 35,
        duration: 0,
        tick,
      })
    }

    for (const treaty of this.treaties) {
      treaty.duration += 1
      treaty.populationSupport = Math.max(5, Math.min(100, treaty.populationSupport + (Math.random() - 0.48) * 0.16))
      treaty.economicAlignment = Math.max(5, Math.min(90, treaty.economicAlignment + (Math.random() - 0.46) * 0.13))
      treaty.culturalHarmony = Math.max(5, Math.min(85, treaty.culturalHarmony + (Math.random() - 0.47) * 0.11))
      treaty.politicalWill = Math.max(10, Math.min(95, treaty.politicalWill + (Math.random() - 0.49) * 0.14))
    }

    const cutoff = tick - 80000
    for (let i = this.treaties.length - 1; i >= 0; i--) {
      if (this.treaties[i].tick < cutoff) this.treaties.splice(i, 1)
    }
  }

  getTreaties(): ReunificationTreaty[] { return this.treaties }
}
