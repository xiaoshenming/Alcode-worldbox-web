// World Geothermal Spring System (v3.244) - Hot springs heated by underground magma
// Natural thermal pools that attract wildlife and provide warmth in cold regions

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface GeothermalSpring {
  id: number
  x: number
  y: number
  radius: number
  temperature: number
  mineralContent: number
  steamOutput: number
  flowRate: number
  tick: number
}

const CHECK_INTERVAL = 2600
const FORM_CHANCE = 0.003
const MAX_SPRINGS = 22

export class WorldGeothermalSpringSystem {
  private springs: GeothermalSpring[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.springs.length < MAX_SPRINGS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 8 + Math.floor(Math.random() * (w - 16))
      const y = 8 + Math.floor(Math.random() * (h - 16))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.GRASS || tile === TileType.SNOW) {
        this.springs.push({
          id: this.nextId++,
          x, y,
          radius: 2 + Math.floor(Math.random() * 4),
          temperature: 35 + Math.random() * 60,
          mineralContent: 10 + Math.random() * 70,
          steamOutput: 20 + Math.random() * 50,
          flowRate: 5 + Math.random() * 30,
          tick,
        })
      }
    }

    for (const spring of this.springs) {
      spring.temperature = Math.max(30, Math.min(98, spring.temperature + (Math.random() - 0.5) * 0.5))
      spring.steamOutput = Math.max(5, spring.steamOutput + (Math.random() - 0.48) * 0.3)
      spring.mineralContent = Math.min(95, spring.mineralContent + 0.005)
      spring.flowRate = Math.max(2, Math.min(50, spring.flowRate + (Math.random() - 0.5) * 0.2))
    }

    const cutoff = tick - 92000
    for (let i = this.springs.length - 1; i >= 0; i--) {
      if (this.springs[i].tick < cutoff) this.springs.splice(i, 1)
    }
  }

}
