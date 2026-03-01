// World Buttes System (v3.282) - Isolated flat-topped hills
// Narrow flat-topped hills with steep sides, remnants of eroded plateaus

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Butte {
  id: number
  x: number
  y: number
  radius: number
  elevation: number
  capIntegrity: number
  erosionRate: number
  colorBanding: number
  windExposure: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.0018
const MAX_BUTTES = 16

export class WorldButtesSystem {
  private buttes: Butte[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.buttes.length < MAX_BUTTES && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.MOUNTAIN) {
        this.buttes.push({
          id: this.nextId++,
          x, y,
          radius: 2 + Math.floor(Math.random() * 3),
          elevation: 50 + Math.random() * 70,
          capIntegrity: 60 + Math.random() * 30,
          erosionRate: 5 + Math.random() * 12,
          colorBanding: 3 + Math.floor(Math.random() * 5),
          windExposure: 30 + Math.random() * 50,
          tick,
        })
      }
    }

    for (const butte of this.buttes) {
      butte.erosionRate = Math.max(2, Math.min(20, butte.erosionRate + (Math.random() - 0.48) * 0.1))
      butte.capIntegrity = Math.max(10, butte.capIntegrity - butte.erosionRate * 0.0003)
      butte.elevation = Math.max(20, butte.elevation - 0.001)
      butte.windExposure = Math.max(15, Math.min(80, butte.windExposure + (Math.random() - 0.5) * 0.2))
    }

    const cutoff = tick - 94000
    for (let i = this.buttes.length - 1; i >= 0; i--) {
      if (this.buttes[i].tick < cutoff) this.buttes.splice(i, 1)
    }
  }

}
