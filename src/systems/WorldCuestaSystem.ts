// World Cuesta System (v3.366) - Cuesta formations
// Asymmetric ridges with a gentle dip slope and a steep scarp slope

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Cuesta {
  id: number
  x: number
  y: number
  length: number
  scarpHeight: number
  dipAngle: number
  rockLayering: number
  erosionStage: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2580
const FORM_CHANCE = 0.0015
const MAX_CUESTAS = 15

export class WorldCuestaSystem {
  private cuestas: Cuesta[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.cuestas.length < MAX_CUESTAS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.GRASS) {
        this.cuestas.push({
          id: this.nextId++,
          x, y,
          length: 20 + Math.random() * 45,
          scarpHeight: 15 + Math.random() * 40,
          dipAngle: 5 + Math.random() * 20,
          rockLayering: 3 + Math.floor(Math.random() * 6),
          erosionStage: 1 + Math.random() * 4,
          spectacle: 12 + Math.random() * 35,
          tick,
        })
      }
    }

    for (const c of this.cuestas) {
      c.scarpHeight = Math.max(8, Math.min(60, c.scarpHeight - 0.00002))
      c.dipAngle = Math.max(2, Math.min(25, c.dipAngle + (Math.random() - 0.5) * 0.08))
      c.spectacle = Math.max(5, Math.min(60, c.spectacle + (Math.random() - 0.47) * 0.1))
    }

    const cutoff = tick - 89000
    for (let i = this.cuestas.length - 1; i >= 0; i--) {
      if (this.cuestas[i].tick < cutoff) this.cuestas.splice(i, 1)
    }
  }

  getCuestas(): Cuesta[] { return this.cuestas }
}
