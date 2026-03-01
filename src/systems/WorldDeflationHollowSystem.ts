// World Deflation Hollow System (v3.384) - Wind-eroded depressions
// Shallow depressions formed by wind removing loose sediment from desert surfaces

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface DeflationHollow {
  id: number
  x: number
  y: number
  depth: number
  diameter: number
  windExposure: number
  sedimentLoss: number
  lagDeposit: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2540
const FORM_CHANCE = 0.0015
const MAX_HOLLOWS = 16

export class WorldDeflationHollowSystem {
  private hollows: DeflationHollow[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.hollows.length < MAX_HOLLOWS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.GRASS) {
        this.hollows.push({
          id: this.nextId++,
          x, y,
          depth: 1 + Math.random() * 10,
          diameter: 20 + Math.random() * 80,
          windExposure: 30 + Math.random() * 50,
          sedimentLoss: 10 + Math.random() * 30,
          lagDeposit: 5 + Math.random() * 20,
          spectacle: 6 + Math.random() * 20,
          tick,
        })
      }
    }

    for (const h of this.hollows) {
      h.depth = Math.min(20, h.depth + 0.00002)
      h.diameter = Math.min(150, h.diameter + 0.00003)
      h.sedimentLoss = Math.max(5, Math.min(60, h.sedimentLoss + (Math.random() - 0.5) * 0.08))
      h.lagDeposit = Math.min(40, h.lagDeposit + 0.00002)
      h.spectacle = Math.max(3, Math.min(40, h.spectacle + (Math.random() - 0.47) * 0.07))
    }

    const cutoff = tick - 89000
    for (let i = this.hollows.length - 1; i >= 0; i--) {
      if (this.hollows[i].tick < cutoff) this.hollows.splice(i, 1)
    }
  }

}
