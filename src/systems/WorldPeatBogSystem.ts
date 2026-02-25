// World Peat Bog System (v3.249) - Waterlogged acidic wetlands accumulating peat
// Ancient wetlands where decomposition is slowed, preserving organic matter for millennia

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface PeatBog {
  id: number
  x: number
  y: number
  radius: number
  peatDepth: number
  acidity: number
  waterTable: number
  sphagnumCover: number
  carbonStore: number
  tick: number
}

const CHECK_INTERVAL = 2800
const FORM_CHANCE = 0.002
const MAX_BOGS = 22

export class WorldPeatBogSystem {
  private bogs: PeatBog[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.bogs.length < MAX_BOGS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 8 + Math.floor(Math.random() * (w - 16))
      const y = 8 + Math.floor(Math.random() * (h - 16))
      const tile = world.getTile(x, y)

      if (tile === TileType.GRASS || tile === TileType.SHALLOW_WATER) {
        this.bogs.push({
          id: this.nextId++,
          x, y,
          radius: 4 + Math.floor(Math.random() * 6),
          peatDepth: 1 + Math.random() * 10,
          acidity: 3 + Math.random() * 3,
          waterTable: 60 + Math.random() * 30,
          sphagnumCover: 20 + Math.random() * 40,
          carbonStore: 10 + Math.random() * 50,
          tick,
        })
      }
    }

    for (const bog of this.bogs) {
      bog.peatDepth = Math.min(30, bog.peatDepth + 0.001)
      bog.sphagnumCover = Math.min(95, bog.sphagnumCover + 0.015)
      bog.carbonStore = Math.min(100, bog.carbonStore + 0.01)
      bog.waterTable = Math.max(30, Math.min(95, bog.waterTable + (Math.random() - 0.5) * 0.5))
    }

    const cutoff = tick - 95000
    for (let i = this.bogs.length - 1; i >= 0; i--) {
      if (this.bogs[i].tick < cutoff) this.bogs.splice(i, 1)
    }
  }

  getBogs(): PeatBog[] { return this.bogs }
}
