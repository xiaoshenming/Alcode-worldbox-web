// Diplomatic Benevolence System (v3.367) - Benevolence initiatives
// Goodwill gestures and humanitarian aid between civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type BenevolenceType = 'humanitarian' | 'educational' | 'medical' | 'infrastructural'

export interface BenevolenceInitiative {
  id: number
  civIdA: number
  civIdB: number
  benevolenceType: BenevolenceType
  generosity: number
  gratitude: number
  reputationGain: number
  influenceSpread: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2390
const INITIATIVE_CHANCE = 0.0025
const MAX_INITIATIVES = 20

const TYPES: BenevolenceType[] = ['humanitarian', 'educational', 'medical', 'infrastructural']

export class DiplomaticBenevolenceSystem {
  private initiatives: BenevolenceInitiative[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.initiatives.length < MAX_INITIATIVES && Math.random() < INITIATIVE_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const bType = TYPES[Math.floor(Math.random() * TYPES.length)]

      this.initiatives.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        benevolenceType: bType,
        generosity: 20 + Math.random() * 40,
        gratitude: 15 + Math.random() * 35,
        reputationGain: 10 + Math.random() * 30,
        influenceSpread: 5 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const i of this.initiatives) {
      i.duration += 1
      i.generosity = Math.max(10, Math.min(85, i.generosity + (Math.random() - 0.47) * 0.12))
      i.gratitude = Math.max(5, Math.min(80, i.gratitude + (Math.random() - 0.45) * 0.13))
      i.reputationGain = Math.max(5, Math.min(70, i.reputationGain + (Math.random() - 0.44) * 0.1))
      i.influenceSpread = Math.max(3, Math.min(60, i.influenceSpread + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 80000
    for (let j = this.initiatives.length - 1; j >= 0; j--) {
      if (this.initiatives[j].tick < cutoff) this.initiatives.splice(j, 1)
    }
  }

  getInitiatives(): BenevolenceInitiative[] { return this.initiatives }
}
