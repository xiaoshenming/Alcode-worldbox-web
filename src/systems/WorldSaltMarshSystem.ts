// World Salt Marsh System (v3.184) - Coastal wetland ecosystems
// Coastlines develop salt marshes with unique tidal ecology

import { EntityManager } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export interface SaltMarsh {
  id: number
  x: number
  y: number
  salinity: number
  biodiversity: number
  area: number
  tidalInfluence: number
  sedimentRate: number
  tick: number
}

const CHECK_INTERVAL = 2600
const SPAWN_CHANCE = 0.004
const MAX_MARSHES = 25

export class WorldSaltMarshSystem {
  private marshes: SaltMarsh[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width
    const h = world.height

    // Spawn marshes on sand tiles adjacent to water
    if (this.marshes.length < MAX_MARSHES && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND) {
        const hasWater = this.checkAdjacentWater(world, x, y, w, h)
        if (hasWater && !this.marshes.some(m => m.x === x && m.y === y)) {
          this.marshes.push({
            id: this.nextId++, x, y,
            salinity: 20 + Math.random() * 40,
            biodiversity: 5 + Math.random() * 15,
            area: 1 + Math.floor(Math.random() * 3),
            tidalInfluence: 0.3 + Math.random() * 0.5,
            sedimentRate: 0.1 + Math.random() * 0.3,
            tick,
          })
        }
      }
    }

    // Update marshes
    for (const m of this.marshes) {
      // Tidal cycles affect salinity
      m.salinity = Math.max(5, Math.min(95, m.salinity + (Math.random() - 0.48) * 2))

      // Biodiversity grows in moderate salinity
      if (m.salinity > 20 && m.salinity < 70) {
        m.biodiversity = Math.min(100, m.biodiversity + 0.05)
      } else {
        m.biodiversity = Math.max(0, m.biodiversity - 0.02)
      }

      // Area expands with sediment
      m.area = Math.min(15, m.area + m.sedimentRate * 0.001)

      // Sediment rate fluctuates with tidal influence
      m.sedimentRate = Math.max(0.05, Math.min(1, m.sedimentRate + (Math.random() - 0.5) * 0.02))
    }

    // Remove marshes with no biodiversity
    this.marshes = this.marshes.filter(m => m.biodiversity > 0.5)
  }

  private checkAdjacentWater(world: World, x: number, y: number, w: number, h: number): boolean {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const t = world.getTile(nx, ny)
        if (t === TileType.SHALLOW_WATER || t === TileType.DEEP_WATER) return true
      }
    }
    return false
  }

  getMarshes(): readonly SaltMarsh[] { return this.marshes }
}
