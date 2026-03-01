// World Mangrove Delta System (v3.252) - Coastal river deltas with dense mangrove forests
// Tidal wetlands where rivers meet the sea, creating rich biodiversity hotspots

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface MangroveDelta {
  id: number
  x: number
  y: number
  radius: number
  mangrovesDensity: number
  sedimentDeposit: number
  tidalRange: number
  biodiversity: number
  salinity: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.002
const MAX_DELTAS = 20

export class WorldMangroveDeltaSystem {
  private deltas: MangroveDelta[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.deltas.length < MAX_DELTAS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SHALLOW_WATER || tile === TileType.SAND) {
        this.deltas.push({
          id: this.nextId++,
          x, y,
          radius: 4 + Math.floor(Math.random() * 5),
          mangrovesDensity: 20 + Math.random() * 40,
          sedimentDeposit: 10 + Math.random() * 30,
          tidalRange: 5 + Math.random() * 20,
          biodiversity: 30 + Math.random() * 40,
          salinity: 15 + Math.random() * 25,
          tick,
        })
      }
    }

    for (const delta of this.deltas) {
      delta.mangrovesDensity = Math.min(90, delta.mangrovesDensity + 0.012)
      delta.sedimentDeposit = Math.min(80, delta.sedimentDeposit + 0.008)
      delta.biodiversity = Math.min(95, delta.biodiversity + 0.01)
      delta.tidalRange = Math.max(2, Math.min(30, delta.tidalRange + (Math.random() - 0.5) * 0.3))
      delta.salinity = Math.max(5, Math.min(45, delta.salinity + (Math.random() - 0.5) * 0.2))
    }

    const cutoff = tick - 90000
    for (let i = this.deltas.length - 1; i >= 0; i--) {
      if (this.deltas[i].tick < cutoff) this.deltas.splice(i, 1)
    }
  }

}
