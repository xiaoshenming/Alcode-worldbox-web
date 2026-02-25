// World Dreikanter System (v3.381) - Dreikanter three-edged stones
// Wind-abraded stones with three distinct faces formed in desert pavements

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Dreikanter {
  id: number
  x: number
  y: number
  faces: number
  polish: number
  windIntensity: number
  stoneSize: number
  desertAge: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2550
const FORM_CHANCE = 0.0014
const MAX_DREIKANTERS = 16

export class WorldDreikanterSystem {
  private dreikanters: Dreikanter[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.dreikanters.length < MAX_DREIKANTERS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.MOUNTAIN) {
        this.dreikanters.push({
          id: this.nextId++,
          x, y,
          faces: 3,
          polish: 10 + Math.random() * 35,
          windIntensity: 25 + Math.random() * 50,
          stoneSize: 5 + Math.random() * 30,
          desertAge: 100 + Math.random() * 500,
          spectacle: 8 + Math.random() * 22,
          tick,
        })
      }
    }

    for (const d of this.dreikanters) {
      d.polish = Math.min(75, d.polish + 0.00003)
      d.windIntensity = Math.max(10, Math.min(80, d.windIntensity + (Math.random() - 0.5) * 0.09))
      d.desertAge = Math.min(1000, d.desertAge + 0.001)
      d.spectacle = Math.max(5, Math.min(45, d.spectacle + (Math.random() - 0.47) * 0.08))
    }

    const cutoff = tick - 91000
    for (let i = this.dreikanters.length - 1; i >= 0; i--) {
      if (this.dreikanters[i].tick < cutoff) this.dreikanters.splice(i, 1)
    }
  }

  getDreikanters(): Dreikanter[] { return this.dreikanters }
}
