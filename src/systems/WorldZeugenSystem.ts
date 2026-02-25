// World Zeugen System (v3.387) - Zeugen mushroom rock formations
// Table-shaped rock pillars with hard cap rock protecting softer base layers

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Zeugen {
  id: number
  x: number
  y: number
  capWidth: number
  pillarHeight: number
  erosionRate: number
  capHardness: number
  baseWeakness: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2570
const FORM_CHANCE = 0.0014
const MAX_ZEUGENS = 15

export class WorldZeugenSystem {
  private zeugens: Zeugen[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.zeugens.length < MAX_ZEUGENS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SAND || tile === TileType.MOUNTAIN) {
        this.zeugens.push({
          id: this.nextId++,
          x, y,
          capWidth: 5 + Math.random() * 15,
          pillarHeight: 3 + Math.random() * 12,
          erosionRate: 5 + Math.random() * 20,
          capHardness: 40 + Math.random() * 40,
          baseWeakness: 20 + Math.random() * 40,
          spectacle: 12 + Math.random() * 30,
          tick,
        })
      }
    }

    for (const z of this.zeugens) {
      z.pillarHeight = Math.max(1, z.pillarHeight - 0.00002)
      z.capHardness = Math.max(20, z.capHardness - 0.00001)
      z.baseWeakness = Math.min(70, z.baseWeakness + 0.00002)
      z.spectacle = Math.max(5, Math.min(55, z.spectacle + (Math.random() - 0.47) * 0.09))
    }

    const cutoff = tick - 90000
    for (let i = this.zeugens.length - 1; i >= 0; i--) {
      if (this.zeugens[i].tick < cutoff) this.zeugens.splice(i, 1)
    }
  }

  getZeugens(): Zeugen[] { return this.zeugens }
}
