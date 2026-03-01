// World Balancing Rock System (v3.402) - Balancing rock formations
// Precariously balanced boulders perched on narrow bases by differential erosion

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface BalancingRock {
  id: number
  x: number
  y: number
  boulderWeight: number
  contactArea: number
  stabilityIndex: number
  weatheringAge: number
  collapseRisk: number
  spectacle: number
  tick: number
}

const CHECK_INTERVAL = 2570
const FORM_CHANCE = 0.0014
const MAX_ROCKS = 15

export class WorldBalancingRockSystem {
  private rocks: BalancingRock[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.rocks.length < MAX_ROCKS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.MOUNTAIN || tile === TileType.GRASS) {
        this.rocks.push({
          id: this.nextId++,
          x, y,
          boulderWeight: 50 + Math.random() * 500,
          contactArea: 0.5 + Math.random() * 3,
          stabilityIndex: 40 + Math.random() * 40,
          weatheringAge: 100 + Math.random() * 500,
          collapseRisk: 5 + Math.random() * 25,
          spectacle: 20 + Math.random() * 40,
          tick,
        })
      }
    }

    for (const r of this.rocks) {
      r.contactArea = Math.max(0.2, r.contactArea - 0.000005)
      r.stabilityIndex = Math.max(5, r.stabilityIndex - 0.00002)
      r.collapseRisk = Math.min(80, r.collapseRisk + 0.00003)
      r.spectacle = Math.max(10, Math.min(70, r.spectacle + (Math.random() - 0.47) * 0.09))
    }

    const cutoff = tick - 89000
    for (let i = this.rocks.length - 1; i >= 0; i--) {
      if (this.rocks[i].tick < cutoff) this.rocks.splice(i, 1)
    }
  }

}
