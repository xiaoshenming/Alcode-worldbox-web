// World Fjord System (v3.272) - Deep glacially carved coastal inlets
// Narrow waterways between steep cliffs formed by glacial erosion

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Fjord {
  id: number
  x: number
  y: number
  length: number
  depth: number
  cliffHeight: number
  waterClarity: number
  glacialActivity: number
  salinity: number
  tick: number
}

const CHECK_INTERVAL = 2900
const FORM_CHANCE = 0.0015
const MAX_FJORDS = 14

export class WorldFjordSystem {
  private fjords: Fjord[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.fjords.length < MAX_FJORDS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 15 + Math.floor(Math.random() * (w - 30))
      const y = 15 + Math.floor(Math.random() * (h - 30))
      const tile = world.getTile(x, y)

      if (tile === TileType.DEEP_WATER || tile === TileType.SHALLOW_WATER) {
        this.fjords.push({
          id: this.nextId++,
          x, y,
          length: 8 + Math.floor(Math.random() * 12),
          depth: 50 + Math.random() * 150,
          cliffHeight: 40 + Math.random() * 80,
          waterClarity: 40 + Math.random() * 40,
          glacialActivity: 10 + Math.random() * 30,
          salinity: 20 + Math.random() * 20,
          tick,
        })
      }
    }

    for (const fjord of this.fjords) {
      fjord.depth = Math.max(30, Math.min(250, fjord.depth + (Math.random() - 0.5) * 0.1))
      fjord.waterClarity = Math.max(20, Math.min(90, fjord.waterClarity + (Math.random() - 0.5) * 0.2))
      fjord.glacialActivity = Math.max(0, Math.min(50, fjord.glacialActivity + (Math.random() - 0.52) * 0.15))
      fjord.cliffHeight = Math.max(20, fjord.cliffHeight - 0.002)
      fjord.salinity = Math.max(10, Math.min(40, fjord.salinity + (Math.random() - 0.5) * 0.1))
    }

    const cutoff = tick - 100000
    for (let i = this.fjords.length - 1; i >= 0; i--) {
      if (this.fjords[i].tick < cutoff) this.fjords.splice(i, 1)
    }
  }

}
