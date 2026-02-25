// World Hoodoo System (v3.307) - Hoodoo rock formations
// Tall thin spires of rock formed by erosion with harder capstone on top

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Hoodoo {
  id: number
  x: number
  y: number
  height: number
  capstoneSize: number
  shaftWidth: number
  erosionRate: number
  colorBanding: number
  stability: number
  tick: number
}

const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.0015
const MAX_HOODOOS = 16

export class WorldHoodooSystem {
  private hoodoos: Hoodoo[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.hoodoos.length < MAX_HOODOOS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.MOUNTAIN) {
        this.hoodoos.push({
          id: this.nextId++,
          x, y,
          height: 15 + Math.random() * 40,
          capstoneSize: 3 + Math.random() * 5,
          shaftWidth: 1 + Math.random() * 3,
          erosionRate: 3 + Math.random() * 10,
          colorBanding: 2 + Math.floor(Math.random() * 6),
          stability: 40 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const hoodoo of this.hoodoos) {
      hoodoo.erosionRate = Math.max(1, Math.min(15, hoodoo.erosionRate + (Math.random() - 0.48) * 0.08))
      hoodoo.height = Math.max(5, hoodoo.height - hoodoo.erosionRate * 0.0003)
      hoodoo.shaftWidth = Math.max(0.5, hoodoo.shaftWidth - 0.0001)
      hoodoo.stability = Math.max(10, hoodoo.stability - hoodoo.erosionRate * 0.0002)
    }

    const cutoff = tick - 90000
    for (let i = this.hoodoos.length - 1; i >= 0; i--) {
      if (this.hoodoos[i].tick < cutoff) this.hoodoos.splice(i, 1)
    }
  }

  getHoodoos(): Hoodoo[] { return this.hoodoos }
}
