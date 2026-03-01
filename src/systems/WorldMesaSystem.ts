// World Mesa System (v3.277) - Flat-topped elevated landforms
// Isolated flat-topped hills with steep sides formed by erosion of horizontal strata

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Mesa {
  id: number
  x: number
  y: number
  radius: number
  elevation: number
  capRockThickness: number
  erosionRate: number
  plateauArea: number
  stratification: number
  tick: number
}

const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.0018
const MAX_MESAS = 15

export class WorldMesaSystem {
  private mesas: Mesa[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.mesas.length < MAX_MESAS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 12 + Math.floor(Math.random() * (w - 24))
      const y = 12 + Math.floor(Math.random() * (h - 24))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SAND) {
        this.mesas.push({
          id: this.nextId++,
          x, y,
          radius: 4 + Math.floor(Math.random() * 5),
          elevation: 60 + Math.random() * 80,
          capRockThickness: 10 + Math.random() * 25,
          erosionRate: 5 + Math.random() * 15,
          plateauArea: 20 + Math.random() * 40,
          stratification: 3 + Math.floor(Math.random() * 6),
          tick,
        })
      }
    }

    for (const mesa of this.mesas) {
      mesa.erosionRate = Math.max(2, Math.min(25, mesa.erosionRate + (Math.random() - 0.48) * 0.1))
      mesa.capRockThickness = Math.max(3, mesa.capRockThickness - mesa.erosionRate * 0.0002)
      mesa.plateauArea = Math.max(10, mesa.plateauArea - mesa.erosionRate * 0.0001)
      mesa.elevation = Math.max(30, mesa.elevation - 0.001)
    }

    const cutoff = tick - 96000
    for (let i = this.mesas.length - 1; i >= 0; i--) {
      if (this.mesas[i].tick < cutoff) this.mesas.splice(i, 1)
    }
  }

}
