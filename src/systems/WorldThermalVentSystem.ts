// World Thermal Vent System (v3.465) - Thermal vent formations
// Deep-sea and terrestrial thermal vents releasing superheated water and minerals

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface ThermalVent {
  id: number
  x: number
  y: number
  heatOutput: number
  mineralPlume: number
  pressure: number
  biomeRadius: number
  tick: number
}

const CHECK_INTERVAL = 2730
const FORM_CHANCE = 0.0012
const MAX_VENTS = 10

export class WorldThermalVentSystem {
  private vents: ThermalVent[] = []
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
        heatOutput: 50 + Math.random() * 50,
        mineralPlume: 10 + Math.random() * 30,
        pressure: 30 + Math.random() * 40,
        biomeRadius: 3 + Math.random() * 5,
        tick,
      })
    }

    for (const v of this.vents) {
      v.heatOutput = Math.max(20, v.heatOutput - 0.01)
      v.mineralPlume = Math.min(100, v.mineralPlume + 0.008)
      v.pressure = 30 + 10 * Math.sin(tick * 0.0005 + v.id)
    }

    for (let _i = this.vents.length - 1; _i >= 0; _i--) { if (this.vents[_i].heatOutput <= 20) this.vents.splice(_i, 1) }
  }

  getVents(): ThermalVent[] { return this.vents }
}
