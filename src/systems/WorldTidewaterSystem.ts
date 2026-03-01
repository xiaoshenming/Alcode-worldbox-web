// World Tidewater System (v3.107) - Tidal water level fluctuations
// Coastal areas experience rising and falling tides affecting terrain access

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type TidePhase = 'rising' | 'high' | 'falling' | 'low'

export interface TideZone {
  id: number
  x: number
  y: number
  phase: TidePhase
  level: number
  maxLevel: number
  cycleSpeed: number
  radius: number
  tick: number
}

const CHECK_INTERVAL = 2000
const SPAWN_CHANCE = 0.003
const MAX_ZONES = 20

export class WorldTidewaterSystem {
  private zones: TideZone[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Create tide zones on coastlines
    if (this.zones.length < MAX_ZONES && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      if (tile != null && tile === 2) {
        let hasWater = false
        for (let dx = -2; dx <= 2 && !hasWater; dx++) {
          for (let dy = -2; dy <= 2 && !hasWater; dy++) {
            const t = world.getTile(x + dx, y + dy)
            if (t != null && t <= 1) hasWater = true
          }
        }
        if (hasWater) {
          this.zones.push({
            id: this.nextId++,
            x, y,
            phase: 'low',
            level: 0,
            maxLevel: 3 + Math.floor(Math.random() * 5),
            cycleSpeed: 0.3 + Math.random() * 0.7,
            radius: 5 + Math.floor(Math.random() * 10),
            tick,
          })
        }
      }
    }

    // Simulate tidal cycles
    for (const z of this.zones) {
      const elapsed = tick - z.tick
      const cycle = Math.sin(elapsed * z.cycleSpeed * 0.0001)
      z.level = (cycle + 1) * 0.5 * z.maxLevel

      if (cycle > 0.7) z.phase = 'high'
      else if (cycle > 0) z.phase = 'rising'
      else if (cycle > -0.7) z.phase = 'falling'
      else z.phase = 'low'
    }

    // Remove old zones
    const cutoff = tick - 180000
    for (let i = this.zones.length - 1; i >= 0; i--) {
      if (this.zones[i].tick < cutoff) this.zones.splice(i, 1)
    }
  }

}
