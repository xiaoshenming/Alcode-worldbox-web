// World Yardang System (v3.375) - Yardang wind-eroded rock formations
// Streamlined rock ridges carved by persistent wind erosion in arid regions

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Yardang {
  id: number
  x: number
  y: number
  length: number
  height: number
  windDirection: number
  erosionStage: number
  rockHardness: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2580
const FORM_CHANCE = 0.0014
const MAX_YARDANGS = 15

export class WorldYardangSystem {
  private yardangs: Yardang[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.yardangs.length < MAX_YARDANGS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.MOUNTAIN) {
        this.yardangs.push({
          id: this.nextId++,
          x, y,
          length: 15 + Math.random() * 50,
          height: 3 + Math.random() * 20,
          windDirection: Math.random() * 360,
          erosionStage: 1 + Math.floor(Math.random() * 4),
          rockHardness: 20 + Math.random() * 60,
          spectacle: 10 + Math.random() * 30,
          tick,
        })
      }
    }

    for (const y of this.yardangs) {
      y.erosionStage = Math.max(1, Math.min(5, y.erosionStage + (Math.random() < 0.001 ? 1 : 0)))
      y.height = Math.max(1, y.height - 0.00001)
      y.rockHardness = Math.max(10, y.rockHardness - 0.00002)
      y.spectacle = Math.max(5, Math.min(55, y.spectacle + (Math.random() - 0.47) * 0.09))
    }

    const cutoff = tick - 92000
    for (let i = this.yardangs.length - 1; i >= 0; i--) {
      if (this.yardangs[i].tick < cutoff) this.yardangs.splice(i, 1)
    }
  }

  getYardangs(): Yardang[] { return this.yardangs }
}
