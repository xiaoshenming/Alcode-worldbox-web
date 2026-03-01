// World Sulfur Spring System (v3.528) - Sulfur spring formations
// Natural springs with high sulfur content and distinctive odor

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface SulfurSpring {
  id: number
  x: number
  y: number
  sulfurConcentration: number
  gasEmission: number
  waterTemperature: number
  mineralCrust: number
  tick: number
}

const CHECK_INTERVAL = 3030
const FORM_CHANCE = 0.0012
const MAX_SPRINGS = 12

export class WorldSulfurSpringSystem {
  private springs: SulfurSpring[] = []
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
        sulfurConcentration: 20 + Math.random() * 40,
        gasEmission: 10 + Math.random() * 30,
        waterTemperature: 30 + Math.random() * 45,
        mineralCrust: 5 + Math.random() * 25,
        tick,
      })
    }

    for (const s of this.springs) {
      s.sulfurConcentration = Math.max(5, Math.min(80, s.sulfurConcentration + (Math.random() - 0.48) * 0.2))
      s.gasEmission = Math.max(3, Math.min(60, s.gasEmission + (Math.random() - 0.5) * 0.18))
      s.mineralCrust = Math.min(65, s.mineralCrust + 0.007)
    }

    const cutoff = tick - 85000
    for (let i = this.springs.length - 1; i >= 0; i--) {
      if (this.springs[i].tick < cutoff) this.springs.splice(i, 1)
    }
  }

}
