// World Inselberg System (v3.351) - Inselberg formations
// Isolated steep-sided residual hills rising abruptly from plains

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Inselberg {
  id: number
  x: number
  y: number
  height: number
  baseRadius: number
  rockType: number
  weatheringRate: number
  vegetationCover: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2610
const FORM_CHANCE = 0.0014
const MAX_INSELBERGS = 15

export class WorldInselbergSystem {
  private inselbergs: Inselberg[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.inselbergs.length < MAX_INSELBERGS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.GRASS || tile === TileType.SAND) {
        this.inselbergs.push({
          id: this.nextId++,
          x, y,
          height: 30 + Math.random() * 70,
          baseRadius: 10 + Math.random() * 25,
          rockType: Math.floor(Math.random() * 4),
          weatheringRate: 1 + Math.random() * 5,
          vegetationCover: 5 + Math.random() * 25,
          spectacle: 20 + Math.random() * 45,
          tick,
        })
      }
    }

    for (const i of this.inselbergs) {
      i.height = Math.max(15, Math.min(120, i.height - i.weatheringRate * 0.00003))
      i.vegetationCover = Math.max(2, Math.min(50, i.vegetationCover + (Math.random() - 0.48) * 0.1))
      i.baseRadius = Math.min(40, i.baseRadius + 0.00002)
      i.spectacle = Math.max(10, Math.min(75, i.spectacle + (Math.random() - 0.47) * 0.1))
    }

    const cutoff = tick - 92000
    for (let j = this.inselbergs.length - 1; j >= 0; j--) {
      if (this.inselbergs[j].tick < cutoff) this.inselbergs.splice(j, 1)
    }
  }

  getInselbergs(): Inselberg[] { return this.inselbergs }
}
