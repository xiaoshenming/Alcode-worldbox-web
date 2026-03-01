// World Floating Island System (v3.82) - Magical floating landmasses
// Islands hover above the world, host rare resources, and drift slowly

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type IslandSize = 'tiny' | 'small' | 'medium' | 'large' | 'massive'

export interface FloatingIsland {
  id: number
  x: number
  y: number
  altitude: number
  size: IslandSize
  driftAngle: number
  driftSpeed: number
  magicLevel: number
  resources: number
  tick: number
}

const CHECK_INTERVAL = 2200
const SPAWN_CHANCE = 0.002
const MAX_ISLANDS = 20

const SIZES: IslandSize[] = ['tiny', 'small', 'medium', 'large', 'massive']

export class WorldFloatingIslandSystem {
  private islands: FloatingIsland[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.islands.length < MAX_ISLANDS && Math.random() < SPAWN_CHANCE) {
      const w = world.width
      const h = world.height
      const sizeIdx = Math.floor(Math.random() * SIZES.length)

      this.islands.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        altitude: 50 + Math.random() * 150,
        size: SIZES[sizeIdx],
        driftAngle: Math.random() * Math.PI * 2,
        driftSpeed: 0.1 + Math.random() * 0.5,
        magicLevel: 20 + Math.random() * 80,
        resources: (sizeIdx + 1) * 15,
        tick,
      })
    }

    // Drift islands
    for (const island of this.islands) {
      island.x += Math.cos(island.driftAngle) * island.driftSpeed
      island.y += Math.sin(island.driftAngle) * island.driftSpeed
      island.driftAngle += (Math.random() - 0.5) * 0.05
      island.magicLevel = Math.max(0, island.magicLevel - 0.01)
    }

    const cutoff = tick - 100000
    for (let i = this.islands.length - 1; i >= 0; i--) {
      if (this.islands[i].tick < cutoff || this.islands[i].magicLevel <= 0) {
        this.islands.splice(i, 1)
      }
    }
  }

}
