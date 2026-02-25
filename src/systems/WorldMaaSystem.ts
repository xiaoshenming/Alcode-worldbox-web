// World Maar System (v3.462) - Maar crater formations
// Low-relief volcanic craters formed by phreatomagmatic eruptions

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface Maar {
  id: number
  x: number
  y: number
  craterWidth: number
  waterDepth: number
  tephraRing: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 2710
const FORM_CHANCE = 0.001
const MAX_MAARS = 9

export class WorldMaarSystem {
  private maars: Maar[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.maars.length < MAX_MAARS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.maars.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        craterWidth: 5 + Math.random() * 10,
        waterDepth: 0,
        tephraRing: 10 + Math.random() * 30,
        age: 0,
        tick,
      })
    }

    for (const m of this.maars) {
      m.age += 0.01
      m.waterDepth = Math.min(50, m.waterDepth + 0.02)
      m.tephraRing = Math.max(0, m.tephraRing - 0.005)
    }

    this.maars = this.maars.filter(m => m.age < 100)
  }

  getMaars(): Maar[] { return this.maars }
}
