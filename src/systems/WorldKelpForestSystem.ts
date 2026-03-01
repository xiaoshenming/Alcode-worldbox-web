// World Kelp Forest System (v3.197) - Underwater kelp forests grow in coastal waters
// Kelp provides habitat, food, and absorbs carbon from the atmosphere

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface KelpForest {
  id: number
  x: number
  y: number
  density: number
  height: number
  biodiversity: number
  carbonAbsorption: number
  growthRate: number
  tick: number
}

const CHECK_INTERVAL = 1700
const SPAWN_CHANCE = 0.004
const MAX_FORESTS = 22

export class WorldKelpForestSystem {
  private forests: KelpForest[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.forests.length < MAX_FORESTS && Math.random() < SPAWN_CHANCE) {
      const w = world.width
      const h = world.height
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Grow in shallow to medium water
      if (tile !== null && tile >= 0 && tile <= 1) {
        const growthRate = 0.5 + Math.random() * 1.5
        this.forests.push({
          id: this.nextId++,
          x, y,
          density: 5 + Math.random() * 20,
          height: 1 + Math.random() * 3,
          biodiversity: 3 + Math.random() * 15,
          carbonAbsorption: 2 + Math.random() * 8,
          growthRate,
          tick,
        })
      }
    }

    for (const f of this.forests) {
      f.density = Math.min(100, f.density + f.growthRate * 0.1)
      f.height = Math.min(20, f.height + 0.03)
      f.biodiversity = Math.min(100, f.biodiversity + 0.08 * f.density / 50)
      f.carbonAbsorption = f.density * 0.15 + f.height * 0.3
    }

    for (let i = this.forests.length - 1; i >= 0; i--) {
      if (tick - this.forests[i].tick > 90000 && this.forests[i].density < 10) {
        this.forests.splice(i, 1)
      }
    }
  }

}
