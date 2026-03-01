// World Blowhole System (v3.315) - Coastal blowhole formations
// Sea caves where wave pressure forces water upward through narrow openings

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Blowhole {
  id: number
  x: number
  y: number
  caveDepth: number
  openingSize: number
  sprayHeight: number
  waveForce: number
  erosionRate: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2600
const FORM_CHANCE = 0.0015
const MAX_BLOWHOLES = 15

export class WorldBlowholeSystem {
  private blowholes: Blowhole[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.blowholes.length < MAX_BLOWHOLES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.SHALLOW_WATER) {
        this.blowholes.push({
          id: this.nextId++,
          x, y,
          caveDepth: 5 + Math.random() * 25,
          openingSize: 1 + Math.random() * 4,
          sprayHeight: 10 + Math.random() * 30,
          waveForce: 20 + Math.random() * 50,
          erosionRate: 2 + Math.random() * 8,
          spectacle: 15 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const bh of this.blowholes) {
      bh.waveForce = Math.max(5, Math.min(80, bh.waveForce + (Math.random() - 0.5) * 0.25))
      bh.sprayHeight = Math.max(5, Math.min(50, bh.sprayHeight + (Math.random() - 0.48) * 0.18))
      bh.openingSize = Math.min(8, bh.openingSize + bh.erosionRate * 0.00005)
      bh.spectacle = Math.max(5, Math.min(70, bh.spectacle + (Math.random() - 0.47) * 0.12))
    }

    const cutoff = tick - 88000
    for (let i = this.blowholes.length - 1; i >= 0; i--) {
      if (this.blowholes[i].tick < cutoff) this.blowholes.splice(i, 1)
    }
  }

}
