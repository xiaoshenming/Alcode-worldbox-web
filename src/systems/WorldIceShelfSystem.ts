// World Ice Shelf System (v3.224) - Floating ice platforms extending from glaciers
// Massive ice formations that calve icebergs and affect ocean currents

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface IceShelf {
  id: number
  x: number
  y: number
  radius: number
  thickness: number
  stability: number
  calvingRate: number
  temperature: number
  tick: number
}

const CHECK_INTERVAL = 3000
const FORM_CHANCE = 0.002
const MAX_SHELVES = 22

export class WorldIceShelfSystem {
  private shelves: IceShelf[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.shelves.length < MAX_SHELVES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 8 + Math.floor(Math.random() * (w - 16))
      const y = 8 + Math.floor(Math.random() * (h - 16))
      const tile = world.getTile(x, y)

      if (tile === TileType.SNOW || tile === TileType.DEEP_WATER) {
        const radius = 4 + Math.floor(Math.random() * 5)
        this.shelves.push({
          id: this.nextId++,
          x, y, radius,
          thickness: 50 + Math.random() * 150,
          stability: 60 + Math.random() * 30,
          calvingRate: 0.1 + Math.random() * 0.5,
          temperature: -30 + Math.random() * 15,
          tick,
        })
      }
    }

    for (const shelf of this.shelves) {
      shelf.stability = Math.max(10, shelf.stability - 0.01)
      shelf.thickness = Math.max(10, shelf.thickness - shelf.calvingRate * 0.05)
      if (shelf.stability < 20) {
        shelf.calvingRate = Math.min(2, shelf.calvingRate + 0.02)
      }
    }

    const cutoff = tick - 100000
    for (let i = this.shelves.length - 1; i >= 0; i--) {
      if (this.shelves[i].tick < cutoff || this.shelves[i].thickness < 10) {
        this.shelves.splice(i, 1)
      }
    }
  }

  getShelves(): readonly IceShelf[] { return this.shelves }
}
