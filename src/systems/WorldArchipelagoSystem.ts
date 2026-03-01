// World Archipelago System (v3.287) - Island chain formations
// Clusters of islands formed by volcanic activity or tectonic processes

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Archipelago {
  id: number
  x: number
  y: number
  radius: number
  islandCount: number
  volcanicActivity: number
  coralGrowth: number
  biodiversity: number
  seaDepth: number
  tick: number
}

const CHECK_INTERVAL = 2900
const FORM_CHANCE = 0.0015
const MAX_ARCHIPELAGOS = 12

export class WorldArchipelagoSystem {
  private archipelagos: Archipelago[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.archipelagos.length < MAX_ARCHIPELAGOS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 15 + Math.floor(Math.random() * (w - 30))
      const y = 15 + Math.floor(Math.random() * (h - 30))
      const tile = world.getTile(x, y)

      if (tile === TileType.DEEP_WATER || tile === TileType.SHALLOW_WATER) {
        this.archipelagos.push({
          id: this.nextId++,
          x, y,
          radius: 8 + Math.floor(Math.random() * 10),
          islandCount: 3 + Math.floor(Math.random() * 8),
          volcanicActivity: 5 + Math.random() * 30,
          coralGrowth: 10 + Math.random() * 40,
          biodiversity: 30 + Math.random() * 40,
          seaDepth: 40 + Math.random() * 100,
          tick,
        })
      }
    }

    for (const arch of this.archipelagos) {
      arch.volcanicActivity = Math.max(0, Math.min(50, arch.volcanicActivity + (Math.random() - 0.52) * 0.2))
      arch.coralGrowth = Math.min(80, arch.coralGrowth + 0.008)
      arch.biodiversity = Math.min(90, arch.biodiversity + 0.006)
      arch.seaDepth = Math.max(20, Math.min(160, arch.seaDepth + (Math.random() - 0.5) * 0.1))
    }

    const cutoff = tick - 98000
    for (let i = this.archipelagos.length - 1; i >= 0; i--) {
      if (this.archipelagos[i].tick < cutoff) this.archipelagos.splice(i, 1)
    }
  }

}
