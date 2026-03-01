// World Pyroclastic Flow System (v3.474) - Pyroclastic flow events
// Fast-moving currents of hot gas and volcanic matter flowing down slopes

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface PyroclasticFlow {
  id: number
  x: number
  y: number
  speed: number
  temperature: number
  density: number
  reachDistance: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.0007
const MAX_FLOWS = 6

export class WorldPyroclasticFlowSystem {
  private flows: PyroclasticFlow[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.flows.length < MAX_FLOWS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.flows.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        speed: 40 + Math.random() * 60,
        temperature: 300 + Math.random() * 400,
        density: 20 + Math.random() * 40,
        reachDistance: 0,
        tick,
      })
    }

    for (const f of this.flows) {
      f.speed = Math.max(0, f.speed - 0.2)
      f.temperature = Math.max(50, f.temperature - 0.5)
      f.reachDistance = Math.min(100, f.reachDistance + f.speed * 0.005)
      f.density = Math.max(0, f.density - 0.05)
    }

    for (let _i = this.flows.length - 1; _i >= 0; _i--) { if (this.flows[_i].speed <= 1) this.flows.splice(_i, 1) }
  }

}
