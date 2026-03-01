// World Playa System (v3.357) - Dry lake bed formations
// Flat dry lake beds in desert basins that occasionally fill with water

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Playa {
  id: number
  x: number
  y: number
  area: number
  saltCrust: number
  waterFrequency: number
  evaporationRate: number
  mineralDeposit: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2570
const FORM_CHANCE = 0.0015
const MAX_PLAYAS = 15

export class WorldPlayaSystem {
  private playas: Playa[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.playas.length < MAX_PLAYAS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.GRASS) {
        this.playas.push({
          id: this.nextId++,
          x, y,
          area: 20 + Math.random() * 50,
          saltCrust: 10 + Math.random() * 40,
          waterFrequency: 3 + Math.random() * 15,
          evaporationRate: 20 + Math.random() * 40,
          mineralDeposit: 5 + Math.random() * 25,
          spectacle: 12 + Math.random() * 35,
          tick,
        })
      }
    }

    for (const p of this.playas) {
      p.saltCrust = Math.max(5, Math.min(70, p.saltCrust + (Math.random() - 0.48) * 0.15))
      p.evaporationRate = Math.max(10, Math.min(70, p.evaporationRate + (Math.random() - 0.5) * 0.12))
      p.mineralDeposit = Math.min(50, p.mineralDeposit + 0.00003)
      p.spectacle = Math.max(5, Math.min(60, p.spectacle + (Math.random() - 0.47) * 0.1))
    }

    const cutoff = tick - 88000
    for (let i = this.playas.length - 1; i >= 0; i--) {
      if (this.playas[i].tick < cutoff) this.playas.splice(i, 1)
    }
  }

}
