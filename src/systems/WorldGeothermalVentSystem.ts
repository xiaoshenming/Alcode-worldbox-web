// World Geothermal Vent System (v3.47) - Underwater vents produce heat and minerals
// Vents create unique ecosystems and can trigger volcanic activity nearby

import { EntityManager } from '../ecs/Entity'
import { World } from '../game/World'
import { TileType } from '../utils/Constants'

export type VentActivity = 'dormant' | 'simmering' | 'active' | 'erupting'

export interface GeothermalVent {
  id: number
  x: number
  y: number
  activity: VentActivity
  heatOutput: number    // 0-100
  mineralOutput: number // resources per cycle
  age: number
  eruptionCooldown: number
  tick: number
}

const CHECK_INTERVAL = 1300
const SPAWN_CHANCE = 0.004
const MAX_VENTS = 30
const HEAT_DECAY = 0.01
const ERUPTION_CHANCE = 0.008

export class WorldGeothermalVentSystem {
  private vents: GeothermalVent[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const w = world.width
    const h = world.height

    // Spawn new vents in deep water
    if (this.vents.length < MAX_VENTS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      if (tile === TileType.DEEP_WATER) {
        if (!this.vents.some(v => v.x === x && v.y === y)) {
          this.vents.push({
            id: this.nextId++,
            x,
            y,
            activity: 'simmering',
            heatOutput: 30 + Math.random() * 30,
            mineralOutput: 1 + Math.random() * 2,
            age: 0,
            eruptionCooldown: 0,
            tick,
          })
        }
      }
    }

    // Update vents
    for (const vent of this.vents) {
      vent.age += CHECK_INTERVAL

      if (vent.eruptionCooldown > 0) {
        vent.eruptionCooldown -= CHECK_INTERVAL
        vent.activity = 'dormant'
        vent.heatOutput *= 0.95
        continue
      }

      // Eruption check
      if (Math.random() < ERUPTION_CHANCE && vent.activity !== 'erupting') {
        vent.activity = 'erupting'
        vent.heatOutput = Math.min(100, vent.heatOutput + 40)
        vent.mineralOutput *= 3
        vent.eruptionCooldown = 2000 + Math.random() * 3000
        continue
      }

      // Normal activity cycle
      vent.heatOutput -= HEAT_DECAY * CHECK_INTERVAL
      if (vent.heatOutput > 60) {
        vent.activity = 'active'
      } else if (vent.heatOutput > 20) {
        vent.activity = 'simmering'
      } else {
        vent.activity = 'dormant'
      }

      vent.mineralOutput = (vent.heatOutput / 50) * (1 + Math.random() * 0.5)
    }

    // Remove depleted vents
    for (let _i = this.vents.length - 1; _i >= 0; _i--) { if (this.vents[_i].heatOutput <= 2) this.vents.splice(_i, 1) }
  }

  getVents(): GeothermalVent[] {
    return this.vents
  }

  private _nearbyVentsBuf: GeothermalVent[] = []
  getNearby(x: number, y: number, radius: number): GeothermalVent[] {
    const r2 = radius * radius
    this._nearbyVentsBuf.length = 0
    for (const v of this.vents) {
      const dx = v.x - x
      const dy = v.y - y
      if (dx * dx + dy * dy <= r2) this._nearbyVentsBuf.push(v)
    }
    return this._nearbyVentsBuf
  }
}
