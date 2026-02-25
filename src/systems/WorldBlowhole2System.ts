// World Blowhole System (v3.423) - Coastal blowhole formations
// Holes in coastal rock through which sea spray is forced upward

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Blowhole2 {
  id: number
  x: number
  y: number
  shaftDepth: number
  openingDiameter: number
  sprayHeight: number
  waveForce: number
  erosionRate: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2640
const FORM_CHANCE = 0.0012
const MAX_BLOWHOLES = 14

export class WorldBlowhole2System {
  private blowholes: Blowhole2[] = []
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

      if (tile === TileType.SHALLOW_WATER || tile === TileType.MOUNTAIN) {
        this.blowholes.push({
          id: this.nextId++,
          x, y,
          shaftDepth: 4 + Math.random() * 15,
          openingDiameter: 1 + Math.random() * 4,
          sprayHeight: 3 + Math.random() * 12,
          waveForce: 20 + Math.random() * 40,
          erosionRate: 0.001 + Math.random() * 0.003,
          spectacle: 25 + Math.random() * 35,
          tick,
        })
      }
    }

    for (const b of this.blowholes) {
      b.openingDiameter = Math.min(8, b.openingDiameter + b.erosionRate * 0.01)
      b.sprayHeight = Math.max(1, Math.min(20, b.sprayHeight + (Math.random() - 0.48) * 0.06))
      b.waveForce = Math.max(10, Math.min(70, b.waveForce + (Math.random() - 0.47) * 0.09))
      b.spectacle = Math.max(10, Math.min(65, b.spectacle + (Math.random() - 0.46) * 0.08))
    }

    const cutoff = tick - 91000
    for (let i = this.blowholes.length - 1; i >= 0; i--) {
      if (this.blowholes[i].tick < cutoff) this.blowholes.splice(i, 1)
    }
  }

  getBlowholes(): Blowhole2[] { return this.blowholes }
}
