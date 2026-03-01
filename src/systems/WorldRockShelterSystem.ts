// World Rock Shelter System (v3.426) - Natural rock shelter formations
// Shallow cave-like openings at the base of cliffs providing natural shelter

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface RockShelter {
  id: number
  x: number
  y: number
  depth: number
  width: number
  ceilingHeight: number
  stability: number
  habitability: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2590
const FORM_CHANCE = 0.0013
const MAX_SHELTERS = 14

export class WorldRockShelterSystem {
  private shelters: RockShelter[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.shelters.length < MAX_SHELTERS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SAND) {
        this.shelters.push({
          id: this.nextId++,
          x, y,
          depth: 3 + Math.random() * 10,
          width: 4 + Math.random() * 12,
          ceilingHeight: 2 + Math.random() * 6,
          stability: 50 + Math.random() * 35,
          habitability: 20 + Math.random() * 40,
          spectacle: 15 + Math.random() * 30,
          tick,
        })
      }
    }

    for (const s of this.shelters) {
      s.depth = Math.min(18, s.depth + 0.000003)
      s.stability = Math.max(15, s.stability - 0.00002)
      s.habitability = Math.max(10, Math.min(70, s.habitability + (Math.random() - 0.47) * 0.08))
      s.spectacle = Math.max(8, Math.min(55, s.spectacle + (Math.random() - 0.48) * 0.07))
    }

    const cutoff = tick - 94000
    for (let i = this.shelters.length - 1; i >= 0; i--) {
      if (this.shelters[i].tick < cutoff) this.shelters.splice(i, 1)
    }
  }

}
