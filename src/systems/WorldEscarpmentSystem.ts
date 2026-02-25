// World Escarpment System (v3.294) - Steep cliff faces and scarps
// Long steep slopes or cliffs formed by faulting or erosion at plateau edges

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Escarpment {
  id: number
  x: number
  y: number
  length: number
  height: number
  steepness: number
  erosionRate: number
  rockfallRisk: number
  vegetationCover: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.0016
const MAX_ESCARPMENTS = 14

export class WorldEscarpmentSystem {
  private escarpments: Escarpment[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.escarpments.length < MAX_ESCARPMENTS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.GRASS) {
        this.escarpments.push({
          id: this.nextId++,
          x, y,
          length: 8 + Math.floor(Math.random() * 12),
          height: 40 + Math.random() * 80,
          steepness: 50 + Math.random() * 40,
          erosionRate: 5 + Math.random() * 15,
          rockfallRisk: 10 + Math.random() * 30,
          vegetationCover: 10 + Math.random() * 30,
          tick,
        })
      }
    }

    for (const esc of this.escarpments) {
      esc.erosionRate = Math.max(2, Math.min(25, esc.erosionRate + (Math.random() - 0.48) * 0.1))
      esc.height = Math.max(15, esc.height - esc.erosionRate * 0.0002)
      esc.rockfallRisk = Math.max(5, Math.min(60, esc.rockfallRisk + (esc.erosionRate - 10) * 0.002))
      esc.vegetationCover = Math.min(60, esc.vegetationCover + 0.004)
    }

    const cutoff = tick - 95000
    for (let i = this.escarpments.length - 1; i >= 0; i--) {
      if (this.escarpments[i].tick < cutoff) this.escarpments.splice(i, 1)
    }
  }

  getEscarpments(): Escarpment[] { return this.escarpments }
}
