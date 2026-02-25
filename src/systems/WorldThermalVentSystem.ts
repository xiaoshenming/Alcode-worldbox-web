// World Thermal Vent System (v3.152) - Undersea hydrothermal vents
// Deep-sea vents produce minerals and heat, occasionally erupting violently

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { TileType } from '../utils/Constants'

export interface ThermalVent {
  id: number
  x: number
  y: number
  temperature: number
  mineralOutput: number
  active: boolean
  erupting: boolean
  tick: number
}

const CHECK_INTERVAL = 3800
const SPAWN_CHANCE = 0.003
const MAX_VENTS = 10
const BASE_TEMP = 200
const MAX_TEMP = 450
const ERUPT_CHANCE = 0.008

export class WorldThermalVentSystem {
  private vents: ThermalVent[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Spawn new vents on deep water tiles
    if (this.vents.length < MAX_VENTS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      if (tile != null && tile === TileType.DEEP_WATER) {
        const nearby = this.vents.some(v => Math.abs(v.x - x) + Math.abs(v.y - y) < 5)
        if (!nearby) {
          this.vents.push({
            id: this.nextId++,
            x, y,
            temperature: BASE_TEMP + Math.random() * 100,
            mineralOutput: 5 + Math.floor(Math.random() * 15),
            active: true,
            erupting: false,
            tick,
          })
        }
      }
    }

    // Update active vents
    for (const v of this.vents) {
      if (!v.active) continue

      // Temperature fluctuation
      v.temperature += (Math.random() - 0.5) * 10
      v.temperature = Math.max(BASE_TEMP * 0.5, Math.min(MAX_TEMP, v.temperature))

      // Mineral output scales with temperature
      v.mineralOutput = Math.floor(5 + (v.temperature / MAX_TEMP) * 15)

      // Eruption cycle
      if (v.erupting) {
        v.temperature = Math.min(MAX_TEMP, v.temperature + 20)
        if (Math.random() < 0.05) {
          v.erupting = false
          v.temperature *= 0.7
        }
      } else if (Math.random() < ERUPT_CHANCE) {
        v.erupting = true
        v.temperature = Math.min(MAX_TEMP, v.temperature * 1.5)
      }

      // Vents can go dormant over long periods
      if (tick - v.tick > 80000 && Math.random() < 0.008) {
        v.active = false
      }
    }

    // Remove inactive vents
    for (let i = this.vents.length - 1; i >= 0; i--) {
      if (!this.vents[i].active) this.vents.splice(i, 1)
    }
  }

  getVents(): readonly ThermalVent[] { return this.vents }
}
