// World Tepui System (v3.372) - Tepui table-top mountain formations
// Flat-topped mountains with sheer vertical cliffs in tropical regions

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Tepui {
  id: number
  x: number
  y: number
  elevation: number
  plateauArea: number
  cliffHeight: number
  endemicSpecies: number
  erosionRate: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2620
const FORM_CHANCE = 0.0013
const MAX_TEPUIS = 12

export class WorldTepuiSystem {
  private tepuis: Tepui[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.tepuis.length < MAX_TEPUIS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.FOREST) {
        this.tepuis.push({
          id: this.nextId++,
          x, y,
          elevation: 1500 + Math.random() * 1500,
          plateauArea: 20 + Math.random() * 60,
          cliffHeight: 300 + Math.random() * 700,
          endemicSpecies: 5 + Math.floor(Math.random() * 20),
          erosionRate: 0.5 + Math.random() * 2,
          spectacle: 30 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const t of this.tepuis) {
      t.erosionRate = Math.max(0.2, Math.min(4, t.erosionRate + (Math.random() - 0.5) * 0.01))
      t.endemicSpecies = Math.max(2, Math.min(40, t.endemicSpecies + (Math.random() - 0.48) * 0.05))
      t.spectacle = Math.max(15, Math.min(80, t.spectacle + (Math.random() - 0.47) * 0.08))
    }

    const cutoff = tick - 95000
    for (let i = this.tepuis.length - 1; i >= 0; i--) {
      if (this.tepuis[i].tick < cutoff) this.tepuis.splice(i, 1)
    }
  }

}
