// World Hot Spring System 2 (v3.456) - Hot spring formations
// Geothermally heated springs providing warmth and mineral-rich waters

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface HotSpring2 {
  id: number
  x: number
  y: number
  waterTemp: number
  mineralRichness: number
  flowRate: number
  healingPotency: number
  tick: number
}

const CHECK_INTERVAL = 2640
const FORM_CHANCE = 0.0014
const MAX_SPRINGS = 10

export class WorldHotSpring2System {
  private springs: HotSpring2[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.springs.length < MAX_SPRINGS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.springs.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        waterTemp: 35 + Math.random() * 45,
        mineralRichness: 10 + Math.random() * 35,
        flowRate: 5 + Math.random() * 20,
        healingPotency: 10 + Math.random() * 25,
        tick,
      })
    }

    for (const s of this.springs) {
      s.waterTemp = Math.max(30, s.waterTemp - 0.005)
      s.mineralRichness = Math.min(100, s.mineralRichness + 0.008)
      s.healingPotency = Math.min(100, s.healingPotency + 0.005)
    }

    for (let _i = this.springs.length - 1; _i >= 0; _i--) { if (this.springs[_i].waterTemp <= 30) this.springs.splice(_i, 1) }
  }

}
