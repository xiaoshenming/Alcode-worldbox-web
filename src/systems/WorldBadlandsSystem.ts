// World Badlands System (v3.274) - Eroded arid terrain with steep gullies
// Heavily eroded landscapes with layered sedimentary formations and sparse vegetation

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Badlands {
  id: number
  x: number
  y: number
  radius: number
  erosionLevel: number
  sedimentLayers: number
  aridity: number
  gullyDepth: number
  mineralExposure: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.002
const MAX_BADLANDS = 16

export class WorldBadlandsSystem {
  private badlands: Badlands[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.badlands.length < MAX_BADLANDS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.MOUNTAIN) {
        this.badlands.push({
          id: this.nextId++,
          x, y,
          radius: 5 + Math.floor(Math.random() * 6),
          erosionLevel: 30 + Math.random() * 40,
          sedimentLayers: 3 + Math.floor(Math.random() * 8),
          aridity: 50 + Math.random() * 40,
          gullyDepth: 10 + Math.random() * 30,
          mineralExposure: 15 + Math.random() * 35,
          tick,
        })
      }
    }

    for (const bl of this.badlands) {
      bl.erosionLevel = Math.min(95, bl.erosionLevel + 0.008)
      bl.gullyDepth = Math.min(60, bl.gullyDepth + 0.005)
      bl.aridity = Math.max(30, Math.min(98, bl.aridity + (Math.random() - 0.5) * 0.2))
      bl.mineralExposure = Math.min(80, bl.mineralExposure + bl.erosionLevel * 0.0003)
    }

    const cutoff = tick - 92000
    for (let i = this.badlands.length - 1; i >= 0; i--) {
      if (this.badlands[i].tick < cutoff) this.badlands.splice(i, 1)
    }
  }

}
