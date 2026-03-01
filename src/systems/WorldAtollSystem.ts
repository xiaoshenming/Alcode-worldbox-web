// World Atoll System (v3.172) - Ring-shaped coral islands form in ocean
// Atolls create unique shallow lagoon ecosystems with rich marine life

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'

export interface Atoll {
  id: number
  x: number
  y: number
  radius: number
  lagoonDepth: number
  coralHealth: number
  marineLife: number
  sandAccumulation: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 5000
const SPAWN_CHANCE = 0.001
const MAX_ATOLLS = 6

export class WorldAtollSystem {
  private atolls: Atoll[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Spawn atolls in deep water
    if (this.atolls.length < MAX_ATOLLS && Math.random() < SPAWN_CHANCE) {
      const x = 10 + Math.floor(Math.random() * (WORLD_WIDTH - 20))
      const y = 10 + Math.floor(Math.random() * (WORLD_HEIGHT - 20))
      if (world.getTile(x, y) === TileType.DEEP_WATER) {
        // Ensure surrounded by water
        let allWater = true
        for (let dx = -5; dx <= 5 && allWater; dx++) {
          for (let dy = -5; dy <= 5 && allWater; dy++) {
            const t = world.getTile(x + dx, y + dy)
            if (t !== TileType.DEEP_WATER && t !== TileType.SHALLOW_WATER) allWater = false
          }
        }
        if (allWater && !this.atolls.some(a => Math.abs(a.x - x) < 15 && Math.abs(a.y - y) < 15)) {
          this.atolls.push({
            id: this.nextId++, x, y,
            radius: 3 + Math.floor(Math.random() * 3),
            lagoonDepth: 2 + Math.random() * 4,
            coralHealth: 50 + Math.random() * 40,
            marineLife: 5 + Math.floor(Math.random() * 10),
            sandAccumulation: 0,
            age: 0, tick,
          })
        }
      }
    }

    for (const atoll of this.atolls) {
      atoll.age++

      // Coral growth affects marine life
      if (atoll.coralHealth > 60 && Math.random() < 0.01) {
        atoll.marineLife = Math.min(30, atoll.marineLife + 1)
      }

      // Sand accumulates on reef ring
      atoll.sandAccumulation = Math.min(100, atoll.sandAccumulation + 0.05)

      // Coral health fluctuation
      atoll.coralHealth = Math.max(10, Math.min(100, atoll.coralHealth + (Math.random() - 0.48) * 2))

      // Lagoon slowly fills
      atoll.lagoonDepth = Math.max(0.5, atoll.lagoonDepth - 0.001)

      // Radius grows very slowly
      if (atoll.age > 50 && atoll.coralHealth > 70 && Math.random() < 0.002) {
        atoll.radius = Math.min(8, atoll.radius + 1)
      }
    }
  }

}
