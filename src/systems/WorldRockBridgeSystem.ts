// World Rock Bridge System (v3.411) - Natural rock bridge formations
// Narrow spans of rock connecting two landmasses over gaps or waterways

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface RockBridge {
  id: number
  x: number
  y: number
  span: number
  width: number
  thickness: number
  loadCapacity: number
  erosionRate: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2610
const FORM_CHANCE = 0.0012
const MAX_BRIDGES = 12

export class WorldRockBridgeSystem {
  private bridges: RockBridge[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.bridges.length < MAX_BRIDGES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.GRASS) {
        this.bridges.push({
          id: this.nextId++,
          x, y,
          span: 8 + Math.random() * 25,
          width: 2 + Math.random() * 8,
          thickness: 1.5 + Math.random() * 6,
          loadCapacity: 30 + Math.random() * 50,
          erosionRate: 2 + Math.random() * 12,
          spectacle: 22 + Math.random() * 38,
          tick,
        })
      }
    }

    for (const b of this.bridges) {
      b.thickness = Math.max(0.5, b.thickness - 0.000007)
      b.loadCapacity = Math.max(10, b.loadCapacity - 0.00002)
      b.erosionRate = Math.max(1, Math.min(20, b.erosionRate + (Math.random() - 0.5) * 0.06))
      b.spectacle = Math.max(10, Math.min(70, b.spectacle + (Math.random() - 0.47) * 0.09))
    }

    const cutoff = tick - 93000
    for (let i = this.bridges.length - 1; i >= 0; i--) {
      if (this.bridges[i].tick < cutoff) this.bridges.splice(i, 1)
    }
  }

}
