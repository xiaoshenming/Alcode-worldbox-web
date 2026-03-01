// World Basalt Column System (v3.189) - Volcanic regions form hexagonal basalt columns
// Cooling lava creates geometric columnar jointing, a natural wonder

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface BasaltColumn {
  id: number
  x: number
  y: number
  height: number
  columnCount: number
  hexagonalPerfection: number
  erosionRate: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 1600
const SPAWN_CHANCE = 0.003
const MAX_FORMATIONS = 20

export class WorldBasaltColumnSystem {
  private formations: BasaltColumn[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Attempt to form new basalt columns near volcanic terrain
    if (this.formations.length < MAX_FORMATIONS && Math.random() < SPAWN_CHANCE) {
      const w = world.width
      const h = world.height
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Form near lava/volcanic terrain (high tile values)
      if (tile !== null && tile >= 7) {
        const columnCount = 10 + Math.floor(Math.random() * 90)
        this.formations.push({
          id: this.nextId++,
          x, y,
          height: 3 + Math.random() * 12,
          columnCount,
          hexagonalPerfection: 40 + Math.random() * 55,
          erosionRate: 0.01 + Math.random() * 0.05,
          age: 0,
          tick,
        })
      }
    }

    // Age and erode existing formations
    for (const f of this.formations) {
      f.age++
      f.height = Math.max(0.5, f.height - f.erosionRate * 0.01)
      f.hexagonalPerfection = Math.max(0, f.hexagonalPerfection - f.erosionRate * 0.1)

      // Weathering increases erosion over time
      if (Math.random() < 0.01) {
        f.erosionRate = Math.min(0.2, f.erosionRate + 0.002)
      }
    }

    // Remove fully eroded formations
    for (let i = this.formations.length - 1; i >= 0; i--) {
      if (this.formations[i].height <= 0.5 || this.formations[i].hexagonalPerfection <= 0) {
        this.formations.splice(i, 1)
      }
    }
  }

}
