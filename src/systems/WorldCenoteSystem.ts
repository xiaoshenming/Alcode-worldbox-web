// World Cenote System (v3.309) - Natural sinkholes with water
// Deep natural pits formed by limestone collapse, often filled with groundwater

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Cenote {
  id: number
  x: number
  y: number
  diameter: number
  depth: number
  waterClarity: number
  waterLevel: number
  stalactites: number
  sacredValue: number
  tick: number
}

const CHECK_INTERVAL = 2900
const FORM_CHANCE = 0.0014
const MAX_CENOTES = 12

export class WorldCenoteSystem {
  private cenotes: Cenote[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.cenotes.length < MAX_CENOTES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.GRASS || tile === TileType.FOREST) {
        this.cenotes.push({
          id: this.nextId++,
          x, y,
          diameter: 4 + Math.floor(Math.random() * 8),
          depth: 20 + Math.random() * 60,
          waterClarity: 40 + Math.random() * 40,
          waterLevel: 30 + Math.random() * 40,
          stalactites: 3 + Math.floor(Math.random() * 15),
          sacredValue: 10 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const cenote of this.cenotes) {
      cenote.waterClarity = Math.max(20, Math.min(90, cenote.waterClarity + (Math.random() - 0.48) * 0.15))
      cenote.waterLevel = Math.max(15, Math.min(80, cenote.waterLevel + (Math.random() - 0.5) * 0.2))
      cenote.stalactites = Math.min(30, cenote.stalactites + 0.002)
      cenote.sacredValue = Math.min(80, cenote.sacredValue + 0.005)
    }

    const cutoff = tick - 96000
    for (let i = this.cenotes.length - 1; i >= 0; i--) {
      if (this.cenotes[i].tick < cutoff) this.cenotes.splice(i, 1)
    }
  }

}
