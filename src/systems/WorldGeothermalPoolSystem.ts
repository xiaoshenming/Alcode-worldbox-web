// World Geothermal Pool System (v3.507) - Geothermal pool formations
// Natural heated pools formed by underground volcanic activity

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface GeothermalPool {
  id: number
  x: number
  y: number
  temperature: number
  mineralContent: number
  steamOutput: number
  depth: number
  tick: number
}

const CHECK_INTERVAL = 3100
const FORM_CHANCE = 0.0012
const MAX_POOLS = 14

export class WorldGeothermalPoolSystem {
  private pools: GeothermalPool[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.pools.length < MAX_POOLS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      this.pools.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        temperature: 40 + Math.random() * 55,
        mineralContent: 10 + Math.random() * 30,
        steamOutput: 5 + Math.random() * 20,
        depth: 2 + Math.random() * 8,
        tick,
      })
    }

    for (const p of this.pools) {
      p.temperature = Math.max(30, Math.min(98, p.temperature + (Math.random() - 0.48) * 0.3))
      p.steamOutput = Math.max(2, Math.min(50, p.steamOutput + (Math.random() - 0.5) * 0.15))
      p.mineralContent = Math.min(80, p.mineralContent + 0.005)
    }

    const cutoff = tick - 85000
    for (let i = this.pools.length - 1; i >= 0; i--) {
      if (this.pools[i].tick < cutoff) this.pools.splice(i, 1)
    }
  }

}
