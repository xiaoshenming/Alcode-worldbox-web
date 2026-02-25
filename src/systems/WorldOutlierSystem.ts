// World Outlier System (v3.393) - Geological outlier formations
// Isolated areas of younger rock surrounded by older strata

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Outlier {
  id: number
  x: number
  y: number
  area: number
  rockAge: number
  surroundingAge: number
  isolationDegree: number
  erosionVulnerability: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2600
const FORM_CHANCE = 0.0013
const MAX_OUTLIERS = 14

export class WorldOutlierSystem {
  private outliers: Outlier[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.outliers.length < MAX_OUTLIERS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.GRASS) {
        this.outliers.push({
          id: this.nextId++,
          x, y,
          area: 10 + Math.random() * 40,
          rockAge: 50 + Math.random() * 200,
          surroundingAge: 300 + Math.random() * 700,
          isolationDegree: 20 + Math.random() * 50,
          erosionVulnerability: 15 + Math.random() * 40,
          spectacle: 8 + Math.random() * 25,
          tick,
        })
      }
    }

    for (const o of this.outliers) {
      o.erosionVulnerability = Math.min(70, o.erosionVulnerability + 0.00002)
      o.isolationDegree = Math.min(80, o.isolationDegree + 0.00001)
      o.spectacle = Math.max(5, Math.min(50, o.spectacle + (Math.random() - 0.47) * 0.08))
    }

    const cutoff = tick - 92000
    for (let i = this.outliers.length - 1; i >= 0; i--) {
      if (this.outliers[i].tick < cutoff) this.outliers.splice(i, 1)
    }
  }

  getOutliers(): Outlier[] { return this.outliers }
}
