// World Fairy Chimney System (v3.405) - Fairy chimney formations
// Tall cone-shaped rock formations with cap stones in volcanic regions

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface FairyChimney {
  id: number
  x: number
  y: number
  height: number
  capSize: number
  coneWidth: number
  tuffHardness: number
  erosionRate: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2590
const FORM_CHANCE = 0.0013
const MAX_CHIMNEYS = 16

export class WorldFairyChimneySystem {
  private chimneys: FairyChimney[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.chimneys.length < MAX_CHIMNEYS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SAND) {
        this.chimneys.push({
          id: this.nextId++,
          x, y,
          height: 5 + Math.random() * 30,
          capSize: 2 + Math.random() * 8,
          coneWidth: 3 + Math.random() * 10,
          tuffHardness: 20 + Math.random() * 50,
          erosionRate: 3 + Math.random() * 15,
          spectacle: 18 + Math.random() * 35,
          tick,
        })
      }
    }

    for (const c of this.chimneys) {
      c.height = Math.max(2, c.height - 0.00001)
      c.coneWidth = Math.max(1, c.coneWidth - 0.000008)
      c.erosionRate = Math.max(1, Math.min(25, c.erosionRate + (Math.random() - 0.5) * 0.07))
      c.spectacle = Math.max(8, Math.min(65, c.spectacle + (Math.random() - 0.47) * 0.09))
    }

    const cutoff = tick - 91000
    for (let i = this.chimneys.length - 1; i >= 0; i--) {
      if (this.chimneys[i].tick < cutoff) this.chimneys.splice(i, 1)
    }
  }

}
