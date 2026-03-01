// World Fumarole System (v3.450) - Volcanic fumarole formations
// Openings in the earth's crust emitting steam and volcanic gases

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface Fumarole {
  id: number
  x: number
  y: number
  steamIntensity: number
  sulfurDeposit: number
  temperature: number
  activityCycle: number
  tick: number
}

const CHECK_INTERVAL = 2700
const FORM_CHANCE = 0.0012
const MAX_FUMAROLES = 11

export class WorldFumaroleSystem {
  private fumaroles: Fumarole[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.fumaroles.length < MAX_FUMAROLES && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.fumaroles.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        steamIntensity: 15 + Math.random() * 35,
        sulfurDeposit: 5 + Math.random() * 20,
        temperature: 80 + Math.random() * 120,
        activityCycle: 0,
        tick,
      })
    }

    for (const f of this.fumaroles) {
      f.activityCycle += 0.01
      f.steamIntensity = 20 + 15 * Math.sin(f.activityCycle)
      f.sulfurDeposit = Math.min(100, f.sulfurDeposit + 0.005)
      f.temperature = Math.max(50, f.temperature - 0.01)
    }

    for (let _i = this.fumaroles.length - 1; _i >= 0; _i--) { if (this.fumaroles[_i].temperature <= 50) this.fumaroles.splice(_i, 1) }
  }

}
