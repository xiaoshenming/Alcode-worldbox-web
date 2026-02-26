// World Lithium Spring System (v3.531) - Lithium-rich spring formations
// Natural springs containing dissolved lithium salts

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface LithiumSpring {
  id: number
  x: number
  y: number
  lithiumContent: number
  flowRate: number
  salinity: number
  therapeuticValue: number
  tick: number
}

const CHECK_INTERVAL = 3070
const FORM_CHANCE = 0.0011
const MAX_SPRINGS = 12

export class WorldLithiumSpringSystem {
  private springs: LithiumSpring[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.springs.length < MAX_SPRINGS && Math.random() < FORM_CHANCE) {
      this.springs.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * world.width),
        y: Math.floor(Math.random() * world.height),
        lithiumContent: 10 + Math.random() * 30,
        flowRate: 5 + Math.random() * 20,
        salinity: 15 + Math.random() * 35,
        therapeuticValue: 20 + Math.random() * 40,
        tick,
      })
    }

    for (const s of this.springs) {
      s.lithiumContent = Math.max(3, Math.min(65, s.lithiumContent + (Math.random() - 0.48) * 0.18))
      s.flowRate = Math.max(2, Math.min(45, s.flowRate + (Math.random() - 0.5) * 0.12))
      s.therapeuticValue = Math.max(10, Math.min(80, s.therapeuticValue + (Math.random() - 0.47) * 0.1))
    }

    const cutoff = tick - 84000
    for (let i = this.springs.length - 1; i >= 0; i--) {
      if (this.springs[i].tick < cutoff) this.springs.splice(i, 1)
    }
  }

  getSprings(): LithiumSpring[] { return this.springs }
}
