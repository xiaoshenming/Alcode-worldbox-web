// World Grotto System (v3.302) - Small picturesque caves
// Natural or artificial caves often near water with unique formations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Grotto {
  id: number
  x: number
  y: number
  depth: number
  waterLevel: number
  stalactites: number
  luminosity: number
  humidity: number
  biodiversity: number
  tick: number
}

const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.0016
const MAX_GROTTOS = 14

export class WorldGrottoSystem {
  private grottos: Grotto[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.grottos.length < MAX_GROTTOS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.FOREST) {
        this.grottos.push({
          id: this.nextId++,
          x, y,
          depth: 10 + Math.random() * 40,
          waterLevel: Math.random() * 30,
          stalactites: 5 + Math.floor(Math.random() * 20),
          luminosity: 5 + Math.random() * 20,
          humidity: 50 + Math.random() * 40,
          biodiversity: 10 + Math.random() * 30,
          tick,
        })
      }
    }

    for (const grotto of this.grottos) {
      grotto.stalactites = Math.min(40, grotto.stalactites + 0.002)
      grotto.waterLevel = Math.max(0, Math.min(50, grotto.waterLevel + (Math.random() - 0.5) * 0.2))
      grotto.humidity = Math.max(30, Math.min(98, grotto.humidity + (Math.random() - 0.5) * 0.15))
      grotto.biodiversity = Math.min(50, grotto.biodiversity + 0.004)
    }

    const cutoff = tick - 95000
    for (let i = this.grottos.length - 1; i >= 0; i--) {
      if (this.grottos[i].tick < cutoff) this.grottos.splice(i, 1)
    }
  }

  getGrottos(): Grotto[] { return this.grottos }
}
