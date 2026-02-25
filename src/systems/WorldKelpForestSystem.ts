// World Kelp Forest System (v3.45) - Underwater kelp forests grow in shallow waters
// Kelp forests provide shelter for marine creatures and produce food resources

import { EntityManager } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type KelpDensity = 'sparse' | 'moderate' | 'dense' | 'overgrown'

export interface KelpForest {
  id: number
  x: number
  y: number
  density: KelpDensity
  size: number         // 1-8
  growthRate: number   // per cycle
  foodOutput: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 1200
const GROWTH_CHANCE = 0.005
const MAX_FORESTS = 50
const BASE_GROWTH = 0.015

const FOOD_MAP: Record<KelpDensity, number> = {
  sparse: 0.5,
  moderate: 1.5,
  dense: 3.0,
  overgrown: 2.0,  // overgrown reduces efficiency
}

export class WorldKelpForestSystem {
  private forests: KelpForest[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width
    const h = world.height

    // Spawn new kelp forests
    if (this.forests.length < MAX_FORESTS && Math.random() < GROWTH_CHANCE) {
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      if (tile === TileType.SHALLOW_WATER) {
        if (!this.forests.some(f => f.x === x && f.y === y)) {
          this.forests.push({
            id: this.nextId++,
            x,
            y,
            density: 'sparse',
            size: 1,
            growthRate: BASE_GROWTH + Math.random() * 0.01,
            foodOutput: FOOD_MAP['sparse'],
            age: 0,
            tick,
          })
        }
      }
    }

    // Update existing forests
    for (const forest of this.forests) {
      forest.age += CHECK_INTERVAL
      forest.size = Math.min(8, forest.size + forest.growthRate)

      // Update density based on size
      if (forest.size >= 7) {
        forest.density = 'overgrown'
      } else if (forest.size >= 5) {
        forest.density = 'dense'
      } else if (forest.size >= 3) {
        forest.density = 'moderate'
      } else {
        forest.density = 'sparse'
      }

      forest.foodOutput = FOOD_MAP[forest.density] * (forest.size / 4)

      // Check tile still valid
      const tile = world.getTile(forest.x, forest.y)
      if (tile !== TileType.SHALLOW_WATER) {
        forest.size -= 0.1
      }
    }

    // Remove dead forests
    this.forests = this.forests.filter(f => f.size > 0)
  }

  getForests(): KelpForest[] {
    return this.forests
  }

  getNearby(x: number, y: number, radius: number): KelpForest[] {
    const r2 = radius * radius
    return this.forests.filter(f => {
      const dx = f.x - x
      const dy = f.y - y
      return dx * dx + dy * dy <= r2
    })
  }
}
