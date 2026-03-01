// World Salt Marsh System (v3.237) - Coastal wetlands with salt-tolerant vegetation
// Tidal marshes that serve as nurseries for marine life and buffer against storms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface SaltMarsh {
  id: number
  x: number
  y: number
  radius: number
  salinity: number
  vegetationDensity: number
  tidalRange: number
  biodiversity: number
  tick: number
}

const CHECK_INTERVAL = 2600
const FORM_CHANCE = 0.003
const MAX_MARSHES = 24

export class WorldSaltMarshSystem {
  private marshes: SaltMarsh[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.marshes.length < MAX_MARSHES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 8 + Math.floor(Math.random() * (w - 16))
      const y = 8 + Math.floor(Math.random() * (h - 16))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.SHALLOW_WATER) {
        this.marshes.push({
          id: this.nextId++,
          x, y,
          radius: 4 + Math.floor(Math.random() * 7),
          salinity: 20 + Math.random() * 50,
          vegetationDensity: 10 + Math.random() * 30,
          tidalRange: 1 + Math.random() * 4,
          biodiversity: 15 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const marsh of this.marshes) {
      marsh.vegetationDensity = Math.min(90, marsh.vegetationDensity + 0.02)
      marsh.biodiversity = Math.min(100, marsh.biodiversity + 0.015)
      marsh.salinity = Math.max(5, Math.min(80, marsh.salinity + (Math.random() - 0.5) * 0.3))
    }

    const cutoff = tick - 90000
    for (let i = this.marshes.length - 1; i >= 0; i--) {
      if (this.marshes[i].tick < cutoff) this.marshes.splice(i, 1)
    }
  }

}
