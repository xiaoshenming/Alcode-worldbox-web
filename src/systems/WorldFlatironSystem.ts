// World Flatiron System (v3.369) - Flatiron formations
// Steeply tilted triangular rock formations resembling clothing irons

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Flatiron {
  id: number
  x: number
  y: number
  height: number
  tiltAngle: number
  rockHardness: number
  weatheringRate: number
  vegetationCover: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2640
const FORM_CHANCE = 0.0014
const MAX_FLATIRONS = 15

export class WorldFlatironSystem {
  private flatirons: Flatiron[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.flatirons.length < MAX_FLATIRONS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.FOREST) {
        this.flatirons.push({
          id: this.nextId++,
          x, y,
          height: 25 + Math.random() * 55,
          tiltAngle: 35 + Math.random() * 45,
          rockHardness: 45 + Math.random() * 40,
          weatheringRate: 1 + Math.random() * 4,
          vegetationCover: 5 + Math.random() * 20,
          spectacle: 20 + Math.random() * 45,
          tick,
        })
      }
    }

    for (const f of this.flatirons) {
      f.height = Math.max(15, Math.min(100, f.height - f.weatheringRate * 0.00002))
      f.vegetationCover = Math.max(2, Math.min(40, f.vegetationCover + (Math.random() - 0.48) * 0.1))
      f.spectacle = Math.max(10, Math.min(75, f.spectacle + (Math.random() - 0.47) * 0.11))
    }

    const cutoff = tick - 93000
    for (let i = this.flatirons.length - 1; i >= 0; i--) {
      if (this.flatirons[i].tick < cutoff) this.flatirons.splice(i, 1)
    }
  }

}
