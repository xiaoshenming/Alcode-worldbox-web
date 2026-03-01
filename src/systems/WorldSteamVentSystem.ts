// World Steam Vent System (v3.486) - Steam vent formations
// Natural openings releasing pressurized steam from underground

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface SteamVent {
  id: number
  x: number
  y: number
  pressure: number
  steamVolume: number
  mineralContent: number
  eruptionCycle: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 2740
const FORM_CHANCE = 0.0008
const MAX_VENTS = 7

export class WorldSteamVentSystem {
  private vents: SteamVent[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.vents.length < MAX_VENTS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.vents.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        pressure: 35 + Math.random() * 45,
        steamVolume: 20 + Math.random() * 35,
        mineralContent: 10 + Math.random() * 25,
        eruptionCycle: 50 + Math.random() * 100,
        age: 0,
        tick,
      })
    }

    for (const v of this.vents) {
      v.age += 0.004
      v.pressure = Math.max(10, Math.min(95, v.pressure + (Math.random() - 0.48) * 0.15))
      v.steamVolume = Math.max(5, v.steamVolume - 0.005)
      v.mineralContent = Math.min(80, v.mineralContent + 0.008)
    }

    for (let _i = this.vents.length - 1; _i >= 0; _i--) { if (!((v) => v.age < 92)(this.vents[_i])) this.vents.splice(_i, 1) }
  }

}
