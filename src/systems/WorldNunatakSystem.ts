// World Nunatak System (v3.324) - Ice field mountain peaks
// Rocky peaks that protrude through glacial ice sheets

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Nunatak {
  id: number
  x: number
  y: number
  peakHeight: number
  iceThickness: number
  exposedRock: number
  weathering: number
  alpineLife: number
  windExposure: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.0015
const MAX_NUNATAKS = 13

export class WorldNunatakSystem {
  private nunataks: Nunatak[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.nunataks.length < MAX_NUNATAKS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SNOW || tile === TileType.MOUNTAIN) {
        this.nunataks.push({
          id: this.nextId++,
          x, y,
          peakHeight: 40 + Math.random() * 80,
          iceThickness: 20 + Math.random() * 60,
          exposedRock: 10 + Math.random() * 40,
          weathering: 5 + Math.random() * 20,
          alpineLife: 2 + Math.random() * 15,
          windExposure: 30 + Math.random() * 50,
          tick,
        })
      }
    }

    for (const nunatak of this.nunataks) {
      nunatak.weathering = Math.min(50, nunatak.weathering + 0.002)
      nunatak.exposedRock = Math.max(5, Math.min(60, nunatak.exposedRock + (Math.random() - 0.48) * 0.1))
      nunatak.alpineLife = Math.max(1, Math.min(25, nunatak.alpineLife + (Math.random() - 0.47) * 0.08))
      nunatak.windExposure = Math.max(15, Math.min(90, nunatak.windExposure + (Math.random() - 0.5) * 0.2))
    }

    const cutoff = tick - 97000
    for (let i = this.nunataks.length - 1; i >= 0; i--) {
      if (this.nunataks[i].tick < cutoff) this.nunataks.splice(i, 1)
    }
  }

}
