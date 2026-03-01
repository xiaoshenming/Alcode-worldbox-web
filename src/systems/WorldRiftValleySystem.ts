// World Rift Valley System (v3.289) - Tectonic rift valleys
// Long narrow valleys formed by tectonic plate divergence with volcanic activity

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface RiftValley {
  id: number
  x: number
  y: number
  length: number
  width: number
  depth: number
  tectonicActivity: number
  lakeFormation: number
  volcanicVents: number
  tick: number
}

const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.0012
const MAX_RIFTS = 10

export class WorldRiftValleySystem {
  private rifts: RiftValley[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.rifts.length < MAX_RIFTS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 20 + Math.floor(Math.random() * (w - 40))
      const y = 20 + Math.floor(Math.random() * (h - 40))
      const tile = world.getTile(x, y)

      if (tile === TileType.GRASS || tile === TileType.MOUNTAIN) {
        this.rifts.push({
          id: this.nextId++,
          x, y,
          length: 15 + Math.floor(Math.random() * 20),
          width: 3 + Math.floor(Math.random() * 5),
          depth: 80 + Math.random() * 150,
          tectonicActivity: 20 + Math.random() * 50,
          lakeFormation: 10 + Math.random() * 30,
          volcanicVents: 2 + Math.floor(Math.random() * 6),
          tick,
        })
      }
    }

    for (const rift of this.rifts) {
      rift.depth = Math.min(300, rift.depth + rift.tectonicActivity * 0.0002)
      rift.width = Math.min(12, rift.width + 0.0001)
      rift.tectonicActivity = Math.max(5, Math.min(80, rift.tectonicActivity + (Math.random() - 0.5) * 0.2))
      rift.lakeFormation = Math.min(70, rift.lakeFormation + 0.005)
    }

    const cutoff = tick - 105000
    for (let i = this.rifts.length - 1; i >= 0; i--) {
      if (this.rifts[i].tick < cutoff) this.rifts.splice(i, 1)
    }
  }

}
