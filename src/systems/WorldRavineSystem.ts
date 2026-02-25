// World Ravine System (v3.348) - Ravine formations
// Deep narrow gorges carved by water erosion over time

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Ravine {
  id: number
  x: number
  y: number
  length: number
  depth: number
  wallSteepness: number
  waterFlow: number
  erosionRate: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2590
const FORM_CHANCE = 0.0015
const MAX_RAVINES = 15

export class WorldRavineSystem {
  private ravines: Ravine[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.ravines.length < MAX_RAVINES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.FOREST) {
        this.ravines.push({
          id: this.nextId++,
          x, y,
          length: 15 + Math.random() * 40,
          depth: 10 + Math.random() * 30,
          wallSteepness: 40 + Math.random() * 45,
          waterFlow: 5 + Math.random() * 25,
          erosionRate: 2 + Math.random() * 8,
          spectacle: 18 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const r of this.ravines) {
      r.depth = Math.min(50, r.depth + r.erosionRate * 0.00004)
      r.waterFlow = Math.max(2, Math.min(50, r.waterFlow + (Math.random() - 0.5) * 0.2))
      r.wallSteepness = Math.max(25, Math.min(90, r.wallSteepness + (Math.random() - 0.49) * 0.12))
      r.spectacle = Math.max(10, Math.min(70, r.spectacle + (Math.random() - 0.47) * 0.11))
    }

    const cutoff = tick - 89000
    for (let i = this.ravines.length - 1; i >= 0; i--) {
      if (this.ravines[i].tick < cutoff) this.ravines.splice(i, 1)
    }
  }

  getRavines(): Ravine[] { return this.ravines }
}
