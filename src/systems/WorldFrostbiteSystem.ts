// World Frostbite System (v3.136) - Frost effects in snow and tundra regions
// Frostbite severity increases with lower temperatures

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type FrostbiteSeverity = 'mild' | 'moderate' | 'severe' | 'extreme'

export interface FrostbiteZone {
  id: number
  x: number
  y: number
  severity: FrostbiteSeverity
  temperature: number
  radius: number
  duration: number
  active: boolean
  tick: number
}

const CHECK_INTERVAL = 3000
const SPAWN_CHANCE = 0.004
const MAX_ZONES = 16

const SEVERITIES: FrostbiteSeverity[] = ['mild', 'moderate', 'severe', 'extreme']
const SEVERITY_TEMP: Record<FrostbiteSeverity, number> = {
  mild: -5, moderate: -15, severe: -30, extreme: -50,
}
const SEVERITY_RADIUS: Record<FrostbiteSeverity, number> = {
  mild: 3, moderate: 5, severe: 7, extreme: 10,
}

export class WorldFrostbiteSystem {
  private zones: FrostbiteZone[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.zones.length < MAX_ZONES && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      // Snow (6) or mountain (5) tiles
      if (tile != null && (tile === 6 || tile === 5)) {
        const sIdx = Math.floor(Math.random() * SEVERITIES.length)
        const severity = SEVERITIES[sIdx]
        this.zones.push({
          id: this.nextId++,
          x, y,
          severity,
          temperature: SEVERITY_TEMP[severity] + Math.floor(Math.random() * 10),
          radius: SEVERITY_RADIUS[severity],
          duration: 0,
          active: true,
          tick,
        })
      }
    }

    for (const z of this.zones) {
      z.duration = tick - z.tick
      // Severity escalates over time
      const age = z.duration
      if (age > 60000 && z.severity === 'mild') z.severity = 'moderate'
      if (age > 120000 && z.severity === 'moderate') z.severity = 'severe'
      if (age > 200000 && z.severity === 'severe') z.severity = 'extreme'
      z.temperature = SEVERITY_TEMP[z.severity] +
        5 * Math.sin(tick * 0.0003 + z.id)
      z.radius = SEVERITY_RADIUS[z.severity]
      // Zones eventually dissipate
      if (age > 300000) z.active = false
    }

    for (let i = this.zones.length - 1; i >= 0; i--) {
      if (!this.zones[i].active) this.zones.splice(i, 1)
    }
  }

  getZones(): readonly FrostbiteZone[] { return this.zones }
}
