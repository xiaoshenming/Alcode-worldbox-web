// World Soda Spring System (v3.519) - Soda spring formations
// Carbonated mineral springs with naturally effervescent water

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface SodaSpring {
  id: number
  x: number
  y: number
  carbonation: number
  mineralDensity: number
  bubbleRate: number
  alkalinity: number
  tick: number
}

const CHECK_INTERVAL = 3020
const FORM_CHANCE = 0.0011
const MAX_SPRINGS = 12

export class WorldSodaSpringSystem {
  private springs: SodaSpring[] = []
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
        carbonation: 20 + Math.random() * 40,
        mineralDensity: 10 + Math.random() * 30,
        bubbleRate: 5 + Math.random() * 25,
        alkalinity: 15 + Math.random() * 35,
        tick,
      })
    }

    for (const s of this.springs) {
      s.carbonation = Math.max(5, Math.min(80, s.carbonation + (Math.random() - 0.48) * 0.2))
      s.bubbleRate = Math.max(2, Math.min(55, s.bubbleRate + (Math.random() - 0.5) * 0.15))
      s.alkalinity = Math.max(5, Math.min(70, s.alkalinity + (Math.random() - 0.47) * 0.12))
    }

    const cutoff = tick - 84000
    for (let i = this.springs.length - 1; i >= 0; i--) {
      if (this.springs[i].tick < cutoff) this.springs.splice(i, 1)
    }
  }

  getSprings(): SodaSpring[] { return this.springs }
}
