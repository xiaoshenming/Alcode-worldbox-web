// World Phreatic Explosion System (v3.477) - Phreatic eruptions
// Steam-driven explosions when groundwater contacts hot volcanic rock

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface PhreaticExplosion {
  id: number
  x: number
  y: number
  blastRadius: number
  steamPressure: number
  debrisEjection: number
  groundwaterDepth: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.0009
const MAX_EXPLOSIONS = 7

export class WorldPhreaticExplosionSystem {
  private explosions: PhreaticExplosion[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.explosions.length < MAX_EXPLOSIONS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.explosions.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        blastRadius: 5 + Math.random() * 15,
        steamPressure: 40 + Math.random() * 50,
        debrisEjection: 20 + Math.random() * 30,
        groundwaterDepth: 10 + Math.random() * 40,
        age: 0,
        tick,
      })
    }

    for (const e of this.explosions) {
      e.age += 0.008
      e.steamPressure = Math.max(5, e.steamPressure - 0.03)
      e.debrisEjection = Math.max(0, e.debrisEjection - 0.02)
      e.groundwaterDepth = Math.min(80, e.groundwaterDepth + 0.01)
    }

    this.explosions = this.explosions.filter(e => e.age < 80)
  }

  getExplosions(): PhreaticExplosion[] { return this.explosions }
}
