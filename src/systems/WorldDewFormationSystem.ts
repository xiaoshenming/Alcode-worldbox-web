// World Dew Formation System (v3.147) - Nighttime temperature drops cause dew
// to form on ground surfaces, moisturizing vegetation and boosting growth

import { World } from '../game/World'
import { TileType } from '../utils/Constants'
import { EntityManager } from '../ecs/Entity'

export interface DewZone {
  id: number
  x: number
  y: number
  moisture: number      // 0-100, accumulated moisture level
  temperature: number   // simulated local temperature
  duration: number      // ticks since formation
  evaporated: boolean
  tick: number
}

const CHECK_INTERVAL = 3500
const SPAWN_CHANCE = 0.004
const MAX_DEW_ZONES = 12
const EVAPORATION_THRESHOLD = 80
const MOISTURE_GAIN = 3.5

export class WorldDewFormationSystem {
  private dewZones: DewZone[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.formDew(world, tick)
    this.evolveDew(world)
    this.cleanup()
  }

  private formDew(world: World, tick: number): void {
    if (this.dewZones.length >= MAX_DEW_ZONES) return
    if (Math.random() > SPAWN_CHANCE) return

    const w = world.width
    const h = world.height

    for (let attempt = 0; attempt < 15; attempt++) {
      const x = 2 + Math.floor(Math.random() * (w - 4))
      const y = 2 + Math.floor(Math.random() * (h - 4))
      const tile = world.getTile(x, y)

      // Dew forms on grass and forest tiles
      if (tile !== TileType.GRASS && tile !== TileType.FOREST) continue

      // Check not too close to existing dew zones
      const tooClose = this.dewZones.some(
        d => Math.abs(d.x - x) < 5 && Math.abs(d.y - y) < 5
      )
      if (tooClose) continue

      this.dewZones.push({
        id: this.nextId++,
        x, y,
        moisture: 10 + Math.random() * 20,
        temperature: 5 + Math.random() * 10,
        duration: 0,
        evaporated: false,
        tick,
      })
      break
    }
  }

  private evolveDew(world: World): void {
    for (const dew of this.dewZones) {
      dew.duration++

      // Moisture accumulates over time
      dew.moisture += MOISTURE_GAIN * (1 - dew.temperature / 100)
      dew.moisture = Math.min(100, dew.moisture)

      // Temperature slowly rises simulating dawn
      dew.temperature += 0.8 + Math.random() * 0.5

      // Nourish surrounding vegetation
      if (dew.moisture > 30) {
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            const tile = world.getTile(dew.x + dx, dew.y + dy)
            if (tile === TileType.SAND && Math.random() < 0.02) {
              world.setTile(dew.x + dx, dew.y + dy, TileType.GRASS)
            }
          }
        }
      }

      // Evaporate when temperature rises
      if (dew.temperature >= EVAPORATION_THRESHOLD) {
        dew.evaporated = true
      }
    }
  }

  private cleanup(): void {
    for (let i = this.dewZones.length - 1; i >= 0; i--) {
      if (this.dewZones[i].evaporated) {
        this.dewZones.splice(i, 1)
      }
    }
  }

  getDewZones(): DewZone[] { return this.dewZones }
}
