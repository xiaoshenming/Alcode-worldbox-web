// World Tidal Lagoon System (v3.222) - Shallow coastal lagoons shaped by tides
// Brackish water bodies separated from the sea by sandbars, rich in marine life

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface TidalLagoon {
  id: number
  x: number
  y: number
  radius: number
  salinity: number
  depth: number
  biodiversity: number
  tidalRange: number
  tick: number
}

const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.003
const MAX_LAGOONS = 28

export class WorldTidalLagoonSystem {
  private lagoons: TidalLagoon[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.lagoons.length < MAX_LAGOONS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SHALLOW_WATER || tile === TileType.SAND) {
        const radius = 3 + Math.floor(Math.random() * 4)
        this.lagoons.push({
          id: this.nextId++,
          x, y, radius,
          salinity: 15 + Math.random() * 30,
          depth: 0.5 + Math.random() * 2.5,
          biodiversity: 20 + Math.random() * 40,
          tidalRange: 0.3 + Math.random() * 1.5,
          tick,
        })
      }
    }

    for (const lagoon of this.lagoons) {
      lagoon.salinity = Math.max(5, Math.min(50, lagoon.salinity + (Math.random() - 0.5) * 2))
      lagoon.biodiversity = Math.min(100, lagoon.biodiversity + 0.02)
    }

    const cutoff = tick - 90000
    for (let i = this.lagoons.length - 1; i >= 0; i--) {
      if (this.lagoons[i].tick < cutoff) {
        this.lagoons.splice(i, 1)
      }
    }
  }

  getLagoons(): readonly TidalLagoon[] { return this.lagoons }
}
