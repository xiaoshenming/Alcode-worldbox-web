// World Mud Flat System (v3.239) - Expansive tidal mudflats
// Coastal areas exposed at low tide, rich in invertebrates and migratory bird habitat

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface MudFlat {
  id: number
  x: number
  y: number
  radius: number
  sedimentDepth: number
  moistureLevel: number
  invertebrateCount: number
  birdActivity: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.003
const MAX_FLATS = 22

export class WorldMudFlatSystem {
  private flats: MudFlat[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.flats.length < MAX_FLATS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 8 + Math.floor(Math.random() * (w - 16))
      const y = 8 + Math.floor(Math.random() * (h - 16))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.SHALLOW_WATER) {
        this.flats.push({
          id: this.nextId++,
          x, y,
          radius: 5 + Math.floor(Math.random() * 6),
          sedimentDepth: 3 + Math.random() * 15,
          moistureLevel: 40 + Math.random() * 50,
          invertebrateCount: 20 + Math.floor(Math.random() * 80),
          birdActivity: 10 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const flat of this.flats) {
      flat.sedimentDepth = Math.max(1, flat.sedimentDepth + (Math.random() - 0.48) * 0.1)
      flat.moistureLevel = Math.max(10, Math.min(95, flat.moistureLevel + (Math.random() - 0.5) * 2))
      flat.invertebrateCount = Math.max(5, Math.min(200, flat.invertebrateCount + Math.floor((Math.random() - 0.45) * 3)))
      flat.birdActivity = Math.min(90, flat.birdActivity + 0.01)
    }

    const cutoff = tick - 88000
    for (let i = this.flats.length - 1; i >= 0; i--) {
      if (this.flats[i].tick < cutoff) this.flats.splice(i, 1)
    }
  }

}
