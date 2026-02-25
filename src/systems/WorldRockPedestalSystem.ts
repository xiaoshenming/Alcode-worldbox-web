// World Rock Pedestal System (v3.399) - Rock pedestal formations
// Mushroom-shaped rock formations where softer base erodes faster than hard cap

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface RockPedestal {
  id: number
  x: number
  y: number
  capDiameter: number
  stemHeight: number
  stemWidth: number
  balanceRisk: number
  erosionRate: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2580
const FORM_CHANCE = 0.0014
const MAX_PEDESTALS = 15

export class WorldRockPedestalSystem {
  private pedestals: RockPedestal[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.pedestals.length < MAX_PEDESTALS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.SAND) {
        this.pedestals.push({
          id: this.nextId++,
          x, y,
          capDiameter: 3 + Math.random() * 12,
          stemHeight: 2 + Math.random() * 10,
          stemWidth: 1 + Math.random() * 5,
          balanceRisk: 5 + Math.random() * 30,
          erosionRate: 3 + Math.random() * 15,
          spectacle: 15 + Math.random() * 35,
          tick,
        })
      }
    }

    for (const p of this.pedestals) {
      p.stemWidth = Math.max(0.5, p.stemWidth - 0.00001)
      p.balanceRisk = Math.min(80, p.balanceRisk + 0.00003)
      p.erosionRate = Math.max(1, Math.min(25, p.erosionRate + (Math.random() - 0.5) * 0.06))
      p.spectacle = Math.max(8, Math.min(60, p.spectacle + (Math.random() - 0.47) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.pedestals.length - 1; i >= 0; i--) {
      if (this.pedestals[i].tick < cutoff) this.pedestals.splice(i, 1)
    }
  }

  getPedestals(): RockPedestal[] { return this.pedestals }
}
