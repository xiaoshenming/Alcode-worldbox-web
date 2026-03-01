// World Thermal Spring System (v3.516) - Thermal spring formations
// Naturally heated springs emerging from geologically active zones

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface ThermalSpring {
  id: number
  x: number
  y: number
  waterTemp: number
  flowVolume: number
  dissolvedMinerals: number
  clarity: number
  tick: number
}

const CHECK_INTERVAL = 2980
const FORM_CHANCE = 0.0012
const MAX_SPRINGS = 14

export class WorldThermalSpringSystem {
  private springs: ThermalSpring[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.springs.length < MAX_SPRINGS && Math.random() < FORM_CHANCE) {
      const w = world.width
      const h = world.height
      this.springs.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        waterTemp: 35 + Math.random() * 50,
        flowVolume: 5 + Math.random() * 30,
        dissolvedMinerals: 10 + Math.random() * 35,
        clarity: 20 + Math.random() * 40,
        tick,
      })
    }

    for (const s of this.springs) {
      s.waterTemp = Math.max(25, Math.min(95, s.waterTemp + (Math.random() - 0.48) * 0.25))
      s.flowVolume = Math.max(2, Math.min(55, s.flowVolume + (Math.random() - 0.5) * 0.15))
      s.clarity = Math.max(10, Math.min(85, s.clarity + (Math.random() - 0.47) * 0.1))
    }

    const cutoff = tick - 86000
    for (let i = this.springs.length - 1; i >= 0; i--) {
      if (this.springs[i].tick < cutoff) this.springs.splice(i, 1)
    }
  }

}
