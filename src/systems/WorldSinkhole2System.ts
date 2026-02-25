// World Sinkhole System (v3.441) - Sinkhole formations
// Depressions formed by collapse of surface layer into underground voids

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Sinkhole2 {
  id: number
  x: number
  y: number
  diameter: number
  depth: number
  collapseRate: number
  waterLevel: number
  stability: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2660
const FORM_CHANCE = 0.0011
const MAX_SINKHOLES = 12

export class WorldSinkhole2System {
  private sinkholes: Sinkhole2[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.sinkholes.length < MAX_SINKHOLES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.GRASS || tile === TileType.SAND) {
        this.sinkholes.push({
          id: this.nextId++,
          x, y,
          diameter: 3 + Math.random() * 12,
          depth: 5 + Math.random() * 20,
          collapseRate: 0.001 + Math.random() * 0.003,
          waterLevel: Math.random() * 10,
          stability: 30 + Math.random() * 40,
          spectacle: 20 + Math.random() * 30,
          tick,
        })
      }
    }

    for (const s of this.sinkholes) {
      s.diameter = Math.min(25, s.diameter + s.collapseRate * 0.01)
      s.depth = Math.min(40, s.depth + 0.000005)
      s.stability = Math.max(5, s.stability - 0.00004)
      s.waterLevel = Math.max(0, Math.min(s.depth * 0.8, s.waterLevel + (Math.random() - 0.47) * 0.06))
      s.spectacle = Math.max(10, Math.min(60, s.spectacle + (Math.random() - 0.48) * 0.07))
    }

    const cutoff = tick - 94000
    for (let i = this.sinkholes.length - 1; i >= 0; i--) {
      if (this.sinkholes[i].tick < cutoff) this.sinkholes.splice(i, 1)
    }
  }

  getSinkholes(): Sinkhole2[] { return this.sinkholes }
}
