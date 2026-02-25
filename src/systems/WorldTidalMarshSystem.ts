// World Tidal Marsh System (v3.259) - Coastal marshes shaped by tidal flooding
// Salt-tolerant grasslands that flood and drain with the rhythm of the tides

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface TidalMarsh {
  id: number
  x: number
  y: number
  radius: number
  spartinaCover: number
  tidalChannel: number
  salinity: number
  sedimentAccretion: number
  birdPopulation: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.002
const MAX_MARSHES = 22

export class WorldTidalMarshSystem {
  private marshes: TidalMarsh[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.marshes.length < MAX_MARSHES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 8 + Math.floor(Math.random() * (w - 16))
      const y = 8 + Math.floor(Math.random() * (h - 16))
      const tile = world.getTile(x, y)

      if (tile === TileType.SHALLOW_WATER || tile === TileType.SAND) {
        this.marshes.push({
          id: this.nextId++,
          x, y,
          radius: 4 + Math.floor(Math.random() * 5),
          spartinaCover: 20 + Math.random() * 35,
          tidalChannel: 5 + Math.random() * 20,
          salinity: 15 + Math.random() * 25,
          sedimentAccretion: 5 + Math.random() * 15,
          birdPopulation: 10 + Math.random() * 30,
          tick,
        })
      }
    }

    for (const marsh of this.marshes) {
      marsh.spartinaCover = Math.min(90, marsh.spartinaCover + 0.01)
      marsh.sedimentAccretion = Math.min(40, marsh.sedimentAccretion + 0.005)
      marsh.birdPopulation = Math.max(5, Math.min(60, marsh.birdPopulation + (Math.random() - 0.48) * 0.3))
      marsh.tidalChannel = Math.min(35, marsh.tidalChannel + 0.003)
      marsh.salinity = Math.max(8, Math.min(40, marsh.salinity + (Math.random() - 0.5) * 0.2))
    }

    const cutoff = tick - 90000
    for (let i = this.marshes.length - 1; i >= 0; i--) {
      if (this.marshes[i].tick < cutoff) this.marshes.splice(i, 1)
    }
  }

  getMarshes(): TidalMarsh[] { return this.marshes }
}
