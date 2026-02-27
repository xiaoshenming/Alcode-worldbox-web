// World Hot Pool System (v3.504) - Hot pool formations
// Naturally heated pools of mineral-rich water in geothermal areas

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface HotPool {
  id: number
  x: number
  y: number
  temperature: number
  mineralRichness: number
  poolDepth: number
  colorIntensity: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 2730
const FORM_CHANCE = 0.0008
const MAX_POOLS = 7

export class WorldHotPoolSystem {
  private pools: HotPool[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.pools.length < MAX_POOLS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.pools.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        temperature: 40 + Math.random() * 50,
        mineralRichness: 20 + Math.random() * 40,
        poolDepth: 5 + Math.random() * 20,
        colorIntensity: 15 + Math.random() * 35,
        age: 0,
        tick,
      })
    }

    for (const p of this.pools) {
      p.age += 0.004
      p.temperature = Math.max(25, p.temperature - 0.006)
      p.mineralRichness = Math.min(85, p.mineralRichness + 0.008)
      p.colorIntensity = Math.min(90, p.colorIntensity + 0.005)
    }

    for (let _i = this.pools.length - 1; _i >= 0; _i--) { if (!((p) => p.age < 93)(this.pools[_i])) this.pools.splice(_i, 1) }
  }

  getPools(): HotPool[] { return this.pools }
}
