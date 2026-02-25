// World Bayou System (v3.267) - Slow-moving marshy waterways
// Subtropical wetland channels with rich ecosystems and dense vegetation

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface Bayou {
  id: number
  x: number
  y: number
  radius: number
  waterFlow: number
  vegetationDensity: number
  murkiness: number
  biodiversity: number
  depth: number
  tick: number
}

const CHECK_INTERVAL = 2600
const FORM_CHANCE = 0.002
const MAX_BAYOUS = 18

export class WorldBayouSystem {
  private bayous: Bayou[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.bayous.length < MAX_BAYOUS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      const x = 10 + Math.floor(Math.random() * (w - 20))
      const y = 10 + Math.floor(Math.random() * (h - 20))
      const tile = world.getTile(x, y)

      if (tile === TileType.SHALLOW_WATER || tile === TileType.GRASS) {
        this.bayous.push({
          id: this.nextId++,
          x, y,
          radius: 5 + Math.floor(Math.random() * 4),
          waterFlow: 5 + Math.random() * 15,
          vegetationDensity: 25 + Math.random() * 35,
          murkiness: 20 + Math.random() * 40,
          biodiversity: 30 + Math.random() * 35,
          depth: 3 + Math.random() * 10,
          tick,
        })
      }
    }

    for (const bayou of this.bayous) {
      bayou.vegetationDensity = Math.min(85, bayou.vegetationDensity + 0.01)
      bayou.murkiness = Math.max(10, Math.min(70, bayou.murkiness + (Math.random() - 0.5) * 0.25))
      bayou.biodiversity = Math.min(90, bayou.biodiversity + 0.008)
      bayou.waterFlow = Math.max(2, Math.min(25, bayou.waterFlow + (Math.random() - 0.5) * 0.2))
      bayou.depth = Math.max(1, Math.min(15, bayou.depth + (Math.random() - 0.5) * 0.1))
    }

    const cutoff = tick - 88000
    for (let i = this.bayous.length - 1; i >= 0; i--) {
      if (this.bayous[i].tick < cutoff) this.bayous.splice(i, 1)
    }
  }

  getBayous(): Bayou[] { return this.bayous }
}
