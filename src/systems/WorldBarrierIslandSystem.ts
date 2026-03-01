// World Barrier Island System (v3.232) - Sandy islands parallel to coastlines
// Dynamic landforms that protect mainland shores from ocean waves and storms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface BarrierIsland {
  id: number
  x: number
  y: number
  length: number
  width: number
  sandVolume: number
  vegetationCover: number
  erosionRate: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.003
const MAX_ISLANDS = 26

export class WorldBarrierIslandSystem {
  private islands: BarrierIsland[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.islands.length < MAX_ISLANDS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 8 + Math.floor(Math.random() * (w - 16))
      const y = 8 + Math.floor(Math.random() * (h - 16))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.SHALLOW_WATER) {
        this.islands.push({
          id: this.nextId++,
          x, y,
          length: 5 + Math.floor(Math.random() * 10),
          width: 1 + Math.floor(Math.random() * 3),
          sandVolume: 40 + Math.random() * 60,
          vegetationCover: Math.random() * 20,
          erosionRate: 0.01 + Math.random() * 0.04,
          tick,
        })
      }
    }

    for (const island of this.islands) {
      island.sandVolume = Math.max(5, island.sandVolume - island.erosionRate)
      island.vegetationCover = Math.min(80, island.vegetationCover + 0.02)
    }

    const cutoff = tick - 92000
    for (let i = this.islands.length - 1; i >= 0; i--) {
      if (this.islands[i].tick < cutoff || this.islands[i].sandVolume < 5) {
        this.islands.splice(i, 1)
      }
    }
  }

}
