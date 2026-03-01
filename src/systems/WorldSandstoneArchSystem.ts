// World Sandstone Arch System (v3.207) - Natural sandstone arch formations in desert areas
// Wind and water erosion carve spectacular arches from sandstone over millennia

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface SandstoneArchZone {
  id: number
  x: number
  y: number
  span: number
  height: number
  erosion: number
  stability: number
  tick: number
}

const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.003
const MAX_ZONES = 35

export class WorldSandstoneArchSystem {
  private zones: SandstoneArchZone[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width, h = world.height
    for (let attempt = 0; attempt < 3; attempt++) {
      if (this.zones.length >= MAX_ZONES) break
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Form in sandy/desert-like terrain
      if (tile !== TileType.SAND && tile !== TileType.MOUNTAIN) continue
      if (Math.random() > FORM_CHANCE) continue

      this.zones.push({
        id: this.nextId++,
        x, y,
        span: 8 + Math.random() * 30,
        height: 5 + Math.random() * 25,
        erosion: 5 + Math.random() * 20,
        stability: 60 + Math.random() * 35,
        tick,
      })
    }

    // Erosion gradually increases, stability decreases
    for (const z of this.zones) {
      z.erosion = Math.min(100, z.erosion + Math.random() * 0.5)
      z.stability = Math.max(0, z.stability - z.erosion * 0.005)
    }

    const cutoff = tick - 55000
    for (let i = this.zones.length - 1; i >= 0; i--) {
      if (this.zones[i].tick < cutoff || this.zones[i].stability <= 0) {
        this.zones.splice(i, 1)
      }
    }
  }

}
