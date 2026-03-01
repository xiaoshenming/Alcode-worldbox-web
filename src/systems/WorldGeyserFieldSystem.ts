// World Geyser Field System (v3.453) - Geyser field formations
// Clusters of geysers creating geothermal zones with periodic eruptions

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface GeyserField {
  id: number
  x: number
  y: number
  geyserCount: number
  eruptionInterval: number
  waterTemperature: number
  mineralContent: number
  lastEruption: number
  tick: number
}

const CHECK_INTERVAL = 2720
const FORM_CHANCE = 0.001
const MAX_FIELDS = 8

export class WorldGeyserFieldSystem {
  private fields: GeyserField[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.fields.length < MAX_FIELDS && Math.random() < FORM_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      this.fields.push({
        id: this.nextId++,
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        geyserCount: 2 + Math.floor(Math.random() * 5),
        eruptionInterval: 300 + Math.floor(Math.random() * 500),
        waterTemperature: 70 + Math.random() * 30,
        mineralContent: 10 + Math.random() * 40,
        lastEruption: tick,
        tick,
      })
    }

    for (const f of this.fields) {
      if (tick - f.lastEruption > f.eruptionInterval) {
        f.lastEruption = tick
        f.waterTemperature = Math.min(100, f.waterTemperature + 5)
        f.mineralContent = Math.min(100, f.mineralContent + 1)
      }
      f.waterTemperature = Math.max(40, f.waterTemperature - 0.02)
    }

    for (let _i = this.fields.length - 1; _i >= 0; _i--) { if (this.fields[_i].waterTemperature <= 40) this.fields.splice(_i, 1) }
  }

}
