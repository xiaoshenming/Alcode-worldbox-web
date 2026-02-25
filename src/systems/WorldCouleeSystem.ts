// World Coulee System (v3.333) - Lava coulee formations
// Steep-sided ravines formed by lava flows or glacial meltwater

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Coulee {
  id: number
  x: number
  y: number
  length: number
  wallSteepness: number
  lavaPresence: number
  erosionRate: number
  vegetationCover: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2580
const FORM_CHANCE = 0.0015
const MAX_COULEES = 15

export class WorldCouleeSystem {
  private coulees: Coulee[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.coulees.length < MAX_COULEES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.GRASS) {
        this.coulees.push({
          id: this.nextId++,
          x, y,
          length: 12 + Math.random() * 35,
          wallSteepness: 30 + Math.random() * 50,
          lavaPresence: Math.random() * 25,
          erosionRate: 2 + Math.random() * 7,
          vegetationCover: 5 + Math.random() * 30,
          spectacle: 15 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const c of this.coulees) {
      c.wallSteepness = Math.max(15, Math.min(90, c.wallSteepness + (Math.random() - 0.49) * 0.14))
      c.lavaPresence = Math.max(0, Math.min(50, c.lavaPresence + (Math.random() - 0.52) * 0.2))
      c.vegetationCover = Math.min(60, c.vegetationCover + (Math.random() - 0.45) * 0.08)
      c.spectacle = Math.max(5, Math.min(65, c.spectacle + (Math.random() - 0.47) * 0.11))
    }

    const cutoff = tick - 87000
    for (let i = this.coulees.length - 1; i >= 0; i--) {
      if (this.coulees[i].tick < cutoff) this.coulees.splice(i, 1)
    }
  }

  getCoulees(): Coulee[] { return this.coulees }
}
