// World Peneplain System (v3.345) - Peneplain formations
// Nearly flat erosional surfaces formed by prolonged weathering

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Peneplain {
  id: number
  x: number
  y: number
  area: number
  flatness: number
  erosionAge: number
  soilDepth: number
  vegetationCover: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2640
const FORM_CHANCE = 0.0014
const MAX_PENEPLAINS = 15

export class WorldPeneplainSystem {
  private peneplains: Peneplain[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.peneplains.length < MAX_PENEPLAINS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.GRASS || tile === TileType.FOREST) {
        this.peneplains.push({
          id: this.nextId++,
          x, y,
          area: 25 + Math.random() * 55,
          flatness: 60 + Math.random() * 30,
          erosionAge: 100 + Math.random() * 500,
          soilDepth: 5 + Math.random() * 20,
          vegetationCover: 20 + Math.random() * 50,
          spectacle: 10 + Math.random() * 30,
          tick,
        })
      }
    }

    for (const p of this.peneplains) {
      p.flatness = Math.max(40, Math.min(98, p.flatness + (Math.random() - 0.49) * 0.08))
      p.soilDepth = Math.min(35, p.soilDepth + 0.00004)
      p.vegetationCover = Math.max(10, Math.min(80, p.vegetationCover + (Math.random() - 0.47) * 0.12))
      p.spectacle = Math.max(5, Math.min(55, p.spectacle + (Math.random() - 0.47) * 0.09))
    }

    const cutoff = tick - 93000
    for (let i = this.peneplains.length - 1; i >= 0; i--) {
      if (this.peneplains[i].tick < cutoff) this.peneplains.splice(i, 1)
    }
  }

  getPeneplains(): Peneplain[] { return this.peneplains }
}
