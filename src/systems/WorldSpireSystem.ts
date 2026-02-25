// World Spire System (v3.299) - Tall rock spire formations
// Narrow towering rock columns formed by differential erosion

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Spire {
  id: number
  x: number
  y: number
  height: number
  baseWidth: number
  stability: number
  erosionRate: number
  rockType: number
  windResistance: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.0018
const MAX_SPIRES = 16

export class WorldSpireSystem {
  private spires: Spire[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.spires.length < MAX_SPIRES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SAND) {
        this.spires.push({
          id: this.nextId++,
          x, y,
          height: 30 + Math.random() * 70,
          baseWidth: 2 + Math.random() * 4,
          stability: 50 + Math.random() * 40,
          erosionRate: 3 + Math.random() * 10,
          rockType: Math.floor(Math.random() * 4),
          windResistance: 30 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const spire of this.spires) {
      spire.erosionRate = Math.max(1, Math.min(15, spire.erosionRate + (Math.random() - 0.48) * 0.08))
      spire.height = Math.max(10, spire.height - spire.erosionRate * 0.0003)
      spire.stability = Math.max(10, spire.stability - spire.erosionRate * 0.0002)
      spire.windResistance = Math.max(15, Math.min(80, spire.windResistance + (Math.random() - 0.5) * 0.15))
    }

    const cutoff = tick - 92000
    for (let i = this.spires.length - 1; i >= 0; i--) {
      if (this.spires[i].tick < cutoff) this.spires.splice(i, 1)
    }
  }

  getSpires(): Spire[] { return this.spires }
}
