// World Salt Flat System (v3.254) - Vast expanses of crystallized salt deposits
// Arid landscapes where ancient lakes evaporated, leaving behind mineral-rich salt crusts

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface SaltFlat {
  id: number
  x: number
  y: number
  radius: number
  crustThickness: number
  mineralPurity: number
  reflectivity: number
  moistureLevel: number
  hexagonalPatterns: number
  tick: number
}

const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.002
const MAX_FLATS = 20

export class WorldSaltFlatSystem {
  private flats: SaltFlat[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.flats.length < MAX_FLATS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.GRASS) {
        this.flats.push({
          id: this.nextId++,
          x, y,
          radius: 5 + Math.floor(Math.random() * 6),
          crustThickness: 2 + Math.random() * 15,
          mineralPurity: 40 + Math.random() * 40,
          reflectivity: 50 + Math.random() * 40,
          moistureLevel: 5 + Math.random() * 20,
          hexagonalPatterns: 10 + Math.random() * 50,
          tick,
        })
      }
    }

    for (const flat of this.flats) {
      flat.crustThickness = Math.min(30, flat.crustThickness + 0.002)
      flat.mineralPurity = Math.min(95, flat.mineralPurity + 0.005)
      flat.reflectivity = Math.max(30, Math.min(98, flat.reflectivity + (Math.random() - 0.45) * 0.2))
      flat.moistureLevel = Math.max(0, Math.min(40, flat.moistureLevel + (Math.random() - 0.55) * 0.3))
      flat.hexagonalPatterns = Math.min(80, flat.hexagonalPatterns + 0.008)
    }

    const cutoff = tick - 92000
    for (let i = this.flats.length - 1; i >= 0; i--) {
      if (this.flats[i].tick < cutoff) this.flats.splice(i, 1)
    }
  }

}
