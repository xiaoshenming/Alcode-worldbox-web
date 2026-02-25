// World Estuary System (v3.339) - Estuary formations
// Partially enclosed coastal bodies where freshwater meets saltwater

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Estuary {
  id: number
  x: number
  y: number
  width: number
  salinity: number
  tidalRange: number
  biodiversity: number
  sedimentFlow: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2600
const FORM_CHANCE = 0.0015
const MAX_ESTUARIES = 15

export class WorldEstuarySystem {
  private estuaries: Estuary[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.estuaries.length < MAX_ESTUARIES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SHALLOW_WATER || tile === TileType.SAND) {
        this.estuaries.push({
          id: this.nextId++,
          x, y,
          width: 10 + Math.random() * 30,
          salinity: 10 + Math.random() * 25,
          tidalRange: 2 + Math.random() * 8,
          biodiversity: 25 + Math.random() * 50,
          sedimentFlow: 10 + Math.random() * 30,
          spectacle: 15 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const e of this.estuaries) {
      e.salinity = Math.max(3, Math.min(40, e.salinity + (Math.random() - 0.5) * 0.2))
      e.tidalRange = Math.max(1, Math.min(15, e.tidalRange + (Math.random() - 0.5) * 0.1))
      e.biodiversity = Math.max(10, Math.min(85, e.biodiversity + (Math.random() - 0.47) * 0.13))
      e.spectacle = Math.max(8, Math.min(65, e.spectacle + (Math.random() - 0.47) * 0.1))
    }

    const cutoff = tick - 91000
    for (let i = this.estuaries.length - 1; i >= 0; i--) {
      if (this.estuaries[i].tick < cutoff) this.estuaries.splice(i, 1)
    }
  }

  getEstuaries(): Estuary[] { return this.estuaries }
}
