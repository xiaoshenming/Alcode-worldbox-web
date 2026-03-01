// World Frost Hollow System (v3.187) - Low-lying terrain traps cold air forming frost hollows
// Persistent cold pockets damage vegetation and create unique microhabitats

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface FrostHollow {
  id: number
  x: number
  y: number
  depth: number
  temperature: number
  frostDuration: number
  vegetationDamage: number
  airPooling: number
  tick: number
}

const CHECK_INTERVAL = 1500
const SPAWN_CHANCE = 0.004
const MAX_HOLLOWS = 25

export class WorldFrostHollowSystem {
  private hollows: FrostHollow[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Attempt to form new frost hollows in low terrain
    if (this.hollows.length < MAX_HOLLOWS && Math.random() < SPAWN_CHANCE) {
      const w = world.width
      const h = world.height
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Form in low-lying grassland or valley terrain
      if (tile !== null && tile >= 3 && tile <= 5) {
        const depth = 2 + Math.random() * 8
        const airPooling = 30 + Math.random() * 50

        this.hollows.push({
          id: this.nextId++,
          x, y,
          depth,
          temperature: -5 - Math.random() * 15,
          frostDuration: 10 + Math.floor(Math.random() * 30),
          vegetationDamage: 0,
          airPooling,
          tick,
        })
      }
    }

    // Evolve existing frost hollows
    for (const fh of this.hollows) {
      fh.temperature = Math.max(-30, fh.temperature - 0.1 * fh.airPooling / 50)
      fh.frostDuration--
      fh.vegetationDamage = Math.min(100, fh.vegetationDamage + Math.abs(fh.temperature) * 0.05)
      fh.airPooling = Math.max(10, fh.airPooling - 0.2)
    }

    // Remove dissipated hollows
    for (let i = this.hollows.length - 1; i >= 0; i--) {
      if (this.hollows[i].frostDuration <= 0 || this.hollows[i].airPooling <= 10) {
        this.hollows.splice(i, 1)
      }
    }
  }

}
