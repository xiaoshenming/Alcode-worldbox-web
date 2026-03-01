// World Gorge System (v3.354) - Gorge formations
// Narrow steep-walled valleys carved by rivers through resistant rock

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Gorge {
  id: number
  x: number
  y: number
  length: number
  depth: number
  wallHeight: number
  riverFlow: number
  rockHardness: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2630
const FORM_CHANCE = 0.0014
const MAX_GORGES = 15

export class WorldGorgeSystem {
  private gorges: Gorge[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.gorges.length < MAX_GORGES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.FOREST) {
        this.gorges.push({
          id: this.nextId++,
          x, y,
          length: 10 + Math.random() * 35,
          depth: 20 + Math.random() * 50,
          wallHeight: 30 + Math.random() * 60,
          riverFlow: 10 + Math.random() * 35,
          rockHardness: 30 + Math.random() * 50,
          spectacle: 25 + Math.random() * 45,
          tick,
        })
      }
    }

    for (const g of this.gorges) {
      g.depth = Math.min(80, g.depth + g.riverFlow * 0.00003 / Math.max(30, g.rockHardness) * 30)
      g.riverFlow = Math.max(5, Math.min(60, g.riverFlow + (Math.random() - 0.5) * 0.18))
      g.wallHeight = Math.max(20, Math.min(100, g.wallHeight + (Math.random() - 0.49) * 0.12))
      g.spectacle = Math.max(15, Math.min(80, g.spectacle + (Math.random() - 0.47) * 0.11))
    }

    const cutoff = tick - 91000
    for (let i = this.gorges.length - 1; i >= 0; i--) {
      if (this.gorges[i].tick < cutoff) this.gorges.splice(i, 1)
    }
  }

}
