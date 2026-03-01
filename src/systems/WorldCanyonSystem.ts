// World Canyon System (v3.284) - Deep river-carved gorges
// Steep-walled valleys carved by rivers over millennia through layered rock

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Canyon {
  id: number
  x: number
  y: number
  length: number
  depth: number
  wallHeight: number
  riverFlow: number
  rockLayers: number
  widthAtTop: number
  tick: number
}

const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.0015
const MAX_CANYONS = 12

export class WorldCanyonSystem {
  private canyons: Canyon[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.canyons.length < MAX_CANYONS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 15 + Math.floor(Math.random() * (w - 30))
      const y = 15 + Math.floor(Math.random() * (h - 30))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SAND) {
        this.canyons.push({
          id: this.nextId++,
          x, y,
          length: 10 + Math.floor(Math.random() * 15),
          depth: 60 + Math.random() * 120,
          wallHeight: 50 + Math.random() * 100,
          riverFlow: 5 + Math.random() * 25,
          rockLayers: 4 + Math.floor(Math.random() * 8),
          widthAtTop: 6 + Math.random() * 10,
          tick,
        })
      }
    }

    for (const canyon of this.canyons) {
      canyon.depth = Math.min(250, canyon.depth + canyon.riverFlow * 0.0001)
      canyon.riverFlow = Math.max(2, Math.min(35, canyon.riverFlow + (Math.random() - 0.5) * 0.2))
      canyon.wallHeight = Math.max(30, canyon.wallHeight - 0.001)
      canyon.widthAtTop = Math.min(20, canyon.widthAtTop + 0.0005)
    }

    const cutoff = tick - 100000
    for (let i = this.canyons.length - 1; i >= 0; i--) {
      if (this.canyons[i].tick < cutoff) this.canyons.splice(i, 1)
    }
  }

}
