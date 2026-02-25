// World Hogback System (v3.363) - Hogback ridge formations
// Steeply tilted ridges of resistant rock with symmetric slopes

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Hogback {
  id: number
  x: number
  y: number
  length: number
  height: number
  dipAngle: number
  rockResistance: number
  erosionRate: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2620
const FORM_CHANCE = 0.0014
const MAX_HOGBACKS = 15

export class WorldHogbackSystem {
  private hogbacks: Hogback[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.hogbacks.length < MAX_HOGBACKS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.FOREST) {
        this.hogbacks.push({
          id: this.nextId++,
          x, y,
          length: 15 + Math.random() * 40,
          height: 20 + Math.random() * 45,
          dipAngle: 30 + Math.random() * 50,
          rockResistance: 40 + Math.random() * 45,
          erosionRate: 1 + Math.random() * 5,
          spectacle: 15 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const h of this.hogbacks) {
      h.height = Math.max(10, Math.min(80, h.height - h.erosionRate * 0.00003))
      h.rockResistance = Math.max(20, Math.min(90, h.rockResistance - 0.00001))
      h.spectacle = Math.max(8, Math.min(70, h.spectacle + (Math.random() - 0.47) * 0.11))
    }

    const cutoff = tick - 91000
    for (let i = this.hogbacks.length - 1; i >= 0; i--) {
      if (this.hogbacks[i].tick < cutoff) this.hogbacks.splice(i, 1)
    }
  }

  getHogbacks(): Hogback[] { return this.hogbacks }
}
