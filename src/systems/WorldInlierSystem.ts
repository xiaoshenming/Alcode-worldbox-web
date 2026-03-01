// World Inlier System (v3.390) - Geological inlier formations
// Areas of older rock surrounded by younger strata exposed by erosion

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Inlier {
  id: number
  x: number
  y: number
  area: number
  rockAge: number
  surroundingAge: number
  exposureDepth: number
  geologicalValue: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2590
const FORM_CHANCE = 0.0013
const MAX_INLIERS = 14

export class WorldInlierSystem {
  private inliers: Inlier[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.inliers.length < MAX_INLIERS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.GRASS) {
        this.inliers.push({
          id: this.nextId++,
          x, y,
          area: 15 + Math.random() * 50,
          rockAge: 200 + Math.random() * 800,
          surroundingAge: 50 + Math.random() * 150,
          exposureDepth: 5 + Math.random() * 25,
          geologicalValue: 20 + Math.random() * 40,
          spectacle: 8 + Math.random() * 22,
          tick,
        })
      }
    }

    for (const il of this.inliers) {
      il.exposureDepth = Math.min(50, il.exposureDepth + 0.00002)
      il.geologicalValue = Math.min(80, il.geologicalValue + 0.00003)
      il.spectacle = Math.max(5, Math.min(50, il.spectacle + (Math.random() - 0.47) * 0.08))
    }

    const cutoff = tick - 93000
    for (let i = this.inliers.length - 1; i >= 0; i--) {
      if (this.inliers[i].tick < cutoff) this.inliers.splice(i, 1)
    }
  }

}
