// World Geyser Field System (v3.97) - Large-scale geothermal eruption zones
// Geyser fields form near mountains, cycle through pressure states, and affect terrain

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type GeyserState = 'dormant' | 'building' | 'erupting' | 'cooling'

export interface GeyserField {
  id: number
  x: number
  y: number
  state: GeyserState
  pressure: number
  radius: number
  lastEruption: number
  tick: number
}

const CHECK_INTERVAL = 2000
const SPAWN_CHANCE = 0.003
const MAX_FIELDS = 20
const PRESSURE_RATE = 0.8
const ERUPTION_THRESHOLD = 90
const COOLING_RATE = 1.5

const STATES: GeyserState[] = ['dormant', 'building', 'erupting', 'cooling']

export class WorldGeyserFieldSystem {
  private fields: GeyserField[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Spawn near mountains
    if (this.fields.length < MAX_FIELDS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      if (tile != null && tile >= 5) {
        this.fields.push({
          id: this.nextId++,
          x, y,
          state: 'dormant',
          pressure: Math.random() * 30,
          radius: 3 + Math.floor(Math.random() * 5),
          lastEruption: 0,
          tick,
        })
      }
    }

    // Update state machine
    for (const f of this.fields) {
      switch (f.state) {
        case 'dormant':
          f.pressure += PRESSURE_RATE * 0.3
          if (f.pressure > 40) f.state = 'building'
          break
        case 'building':
          f.pressure += PRESSURE_RATE
          if (f.pressure >= ERUPTION_THRESHOLD) {
            f.state = 'erupting'
            f.lastEruption = tick
          }
          break
        case 'erupting':
          f.pressure = Math.max(0, f.pressure - 5)
          if (f.pressure <= 10) f.state = 'cooling'
          break
        case 'cooling':
          f.pressure = Math.max(0, f.pressure - COOLING_RATE)
          if (f.pressure <= 0) f.state = 'dormant'
          break
      }
    }

    // Remove very old fields
    const cutoff = tick - 120000
    for (let i = this.fields.length - 1; i >= 0; i--) {
      if (this.fields[i].tick < cutoff) this.fields.splice(i, 1)
    }
  }

  getFields(): readonly GeyserField[] { return this.fields }
}
