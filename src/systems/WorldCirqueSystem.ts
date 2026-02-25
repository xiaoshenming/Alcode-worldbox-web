// World Cirque System (v3.327) - Glacial cirque formations
// Bowl-shaped depressions carved by glacial erosion at mountain heads

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Cirque {
  id: number
  x: number
  y: number
  diameter: number
  wallHeight: number
  glacialDepth: number
  erosionRate: number
  tarnPresent: boolean
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2650
const FORM_CHANCE = 0.0014
const MAX_CIRQUES = 15

export class WorldCirqueSystem {
  private cirques: Cirque[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.cirques.length < MAX_CIRQUES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SNOW) {
        this.cirques.push({
          id: this.nextId++,
          x, y,
          diameter: 8 + Math.random() * 30,
          wallHeight: 20 + Math.random() * 60,
          glacialDepth: 5 + Math.random() * 20,
          erosionRate: 1 + Math.random() * 6,
          tarnPresent: Math.random() > 0.4,
          spectacle: 20 + Math.random() * 45,
          tick,
        })
      }
    }

    for (const c of this.cirques) {
      c.wallHeight = Math.max(10, Math.min(100, c.wallHeight + (Math.random() - 0.49) * 0.15))
      c.glacialDepth = Math.max(2, Math.min(40, c.glacialDepth + (Math.random() - 0.5) * 0.12))
      c.diameter = Math.min(50, c.diameter + c.erosionRate * 0.00004)
      c.spectacle = Math.max(10, Math.min(75, c.spectacle + (Math.random() - 0.47) * 0.1))
    }

    const cutoff = tick - 90000
    for (let i = this.cirques.length - 1; i >= 0; i--) {
      if (this.cirques[i].tick < cutoff) this.cirques.splice(i, 1)
    }
  }

  getCirques(): Cirque[] { return this.cirques }
}
