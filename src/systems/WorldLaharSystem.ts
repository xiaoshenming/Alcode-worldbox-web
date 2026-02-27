// World Lahar System (v3.471) - Lahar mudflow formations
// Destructive volcanic mudflows carrying debris down volcano slopes

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface Lahar {
  id: number
  x: number
  y: number
  velocity: number
  debrisLoad: number
  temperature: number
  destructionPath: number
  tick: number
}

const CHECK_INTERVAL = 2660
const FORM_CHANCE = 0.0009
const MAX_LAHARS = 8

export class WorldLaharSystem {
  private lahars: Lahar[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.lahars.length < MAX_LAHARS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.lahars.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        velocity: 20 + Math.random() * 40,
        debrisLoad: 30 + Math.random() * 40,
        temperature: 40 + Math.random() * 30,
        destructionPath: 0,
        tick,
      })
    }

    for (const l of this.lahars) {
      l.velocity = Math.max(0, l.velocity - 0.1)
      l.debrisLoad = Math.max(0, l.debrisLoad - 0.05)
      l.temperature = Math.max(10, l.temperature - 0.03)
      l.destructionPath = Math.min(100, l.destructionPath + l.velocity * 0.01)
    }

    for (let _i = this.lahars.length - 1; _i >= 0; _i--) { if (this.lahars[_i].velocity <= 1) this.lahars.splice(_i, 1) }
  }

  getLahars(): Lahar[] { return this.lahars }
}
