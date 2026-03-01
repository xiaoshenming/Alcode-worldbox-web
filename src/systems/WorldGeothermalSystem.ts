// World Geothermal System (v3.87) - Hot springs and geysers near mountains
// Geothermal vents heat surroundings, create steam, and attract creatures

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type VentType = 'hot_spring' | 'geyser' | 'fumarole' | 'mud_pot'

export interface GeothermalVent {
  id: number
  x: number
  y: number
  type: VentType
  temperature: number
  pressure: number
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 1800
const SPAWN_CHANCE = 0.004
const MAX_VENTS = 30

const VENT_TYPES: VentType[] = ['hot_spring', 'geyser', 'fumarole', 'mud_pot']

export class WorldGeothermalSystem {
  private vents: GeothermalVent[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.vents.length < MAX_VENTS && Math.random() < SPAWN_CHANCE) {
      const w = world.width
      const h = world.height
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile(x, y)

      // Spawn near mountain terrain
      if (tile !== null && tile >= 6) {
        const typeIdx = Math.floor(Math.random() * VENT_TYPES.length)
        this.vents.push({
          id: this.nextId++,
          x, y,
          type: VENT_TYPES[typeIdx],
          temperature: 60 + Math.random() * 140,
          pressure: 20 + Math.random() * 80,
          active: true,
          tick,
        })
      }
    }

    // Update vents
    for (const v of this.vents) {
      if (v.type === 'geyser') {
        v.pressure += 0.5
        if (v.pressure > 90) {
          v.active = true
          v.pressure = 20 + Math.random() * 30
        }
      }
      v.temperature = Math.max(40, v.temperature - 0.01)
    }

    const cutoff = tick - 60000
    for (let i = this.vents.length - 1; i >= 0; i--) {
      if (this.vents[i].tick < cutoff) this.vents.splice(i, 1)
    }
  }

}
