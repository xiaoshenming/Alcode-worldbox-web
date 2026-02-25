// World Peat Bog System (v3.167) - Waterlogged areas form peat bogs
// Bogs accumulate organic matter, store carbon, and create unique ecosystems

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/Constants'

export interface PeatBog {
  id: number
  x: number
  y: number
  depth: number
  moisture: number
  carbonStored: number
  decompositionRate: number
  age: number
  biodiversity: number
  tick: number
}

const CHECK_INTERVAL = 4000
const SPAWN_CHANCE = 0.002
const MAX_BOGS = 10

export class WorldPeatBogSystem {
  private bogs: PeatBog[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Spawn new bogs near water/grass boundaries
    if (this.bogs.length < MAX_BOGS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * WORLD_WIDTH)
      const y = Math.floor(Math.random() * WORLD_HEIGHT)
      const tile = world.getTile(x, y)
      if (tile === TileType.GRASS || tile === TileType.FOREST) {
        // Check for nearby water
        let hasWater = false
        for (let dx = -2; dx <= 2 && !hasWater; dx++) {
          for (let dy = -2; dy <= 2 && !hasWater; dy++) {
            const nx = x + dx, ny = y + dy
            if (nx >= 0 && nx < WORLD_WIDTH && ny >= 0 && ny < WORLD_HEIGHT) {
              const nt = world.getTile(nx, ny)
              if (nt === TileType.SHALLOW_WATER || nt === TileType.DEEP_WATER) hasWater = true
            }
          }
        }
        if (hasWater && !this.bogs.some(b => Math.abs(b.x - x) < 5 && Math.abs(b.y - y) < 5)) {
          this.bogs.push({
            id: this.nextId++, x, y,
            depth: 1 + Math.random() * 3,
            moisture: 60 + Math.random() * 30,
            carbonStored: 10 + Math.random() * 20,
            decompositionRate: 0.1 + Math.random() * 0.3,
            age: 0,
            biodiversity: 3 + Math.floor(Math.random() * 5),
            tick,
          })
        }
      }
    }

    for (const bog of this.bogs) {
      bog.age++

      // Accumulate carbon from organic matter
      bog.carbonStored += (1 - bog.decompositionRate) * 0.1
      bog.depth = Math.min(20, bog.depth + 0.01)

      // Moisture fluctuation
      bog.moisture = Math.max(30, Math.min(100, bog.moisture + (Math.random() - 0.45) * 2))

      // Biodiversity changes with moisture
      if (bog.moisture > 70 && Math.random() < 0.01) {
        bog.biodiversity = Math.min(15, bog.biodiversity + 1)
      } else if (bog.moisture < 40 && Math.random() < 0.02) {
        bog.biodiversity = Math.max(1, bog.biodiversity - 1)
      }

      // Decomposition rate affected by moisture
      bog.decompositionRate = 0.1 + (1 - bog.moisture / 100) * 0.4
    }
  }

  getBogs(): readonly PeatBog[] { return this.bogs }
}
