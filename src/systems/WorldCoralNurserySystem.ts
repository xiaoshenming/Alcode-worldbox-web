// World Coral Nursery System (v3.177) - Shallow water areas naturally form coral nurseries
// Coral nurseries cultivate new coral, boosting marine biodiversity over time

import { EntityManager } from '../ecs/Entity'

export type CoralHealth = 'pristine' | 'healthy' | 'degraded' | 'dead'

export interface CoralNursery {
  id: number
  x: number
  y: number
  coralCount: number
  health: CoralHealth
  growthRate: number
  biodiversity: number
  waterTemp: number
  tick: number
}

const CHECK_INTERVAL = 3500
const SPAWN_CHANCE = 0.004
const MAX_NURSERIES = 12

const HEALTH_LEVELS: CoralHealth[] = ['pristine', 'healthy', 'degraded', 'dead']
const HEALTH_GROWTH: Record<CoralHealth, number> = {
  pristine: 1.0, healthy: 0.7, degraded: 0.3, dead: 0,
}

export class WorldCoralNurserySystem {
  private nurseries: CoralNursery[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: any, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Spawn new nurseries in shallow water
    if (this.nurseries.length < MAX_NURSERIES && Math.random() < SPAWN_CHANCE) {
      const w = world.width || 200
      const h = world.height || 200
      const x = Math.floor(Math.random() * w)
      const y = Math.floor(Math.random() * h)
      const tile = world.getTile?.(x, y)
      if (tile === 1 || tile === 'shallow_water') {
        this.nurseries.push({
          id: this.nextId++, x, y,
          coralCount: 1 + Math.floor(Math.random() * 3),
          health: 'healthy',
          growthRate: 0.2 + Math.random() * 0.3,
          biodiversity: 1 + Math.random() * 4,
          waterTemp: 22 + Math.random() * 6,
          tick,
        })
      }
    }

    for (const n of this.nurseries) {
      if (n.health === 'dead') continue

      // Grow coral based on health
      const mult = HEALTH_GROWTH[n.health]
      if (Math.random() < n.growthRate * mult * 0.04) {
        n.coralCount++
        n.biodiversity = Math.min(50, n.biodiversity + 0.2)
      }

      // Temperature stress affects health
      if (n.waterTemp > 28 && Math.random() < 0.02) {
        const idx = HEALTH_LEVELS.indexOf(n.health)
        if (idx < HEALTH_LEVELS.length - 1) n.health = HEALTH_LEVELS[idx + 1]
      }

      // Natural recovery in good conditions
      if (n.waterTemp <= 26 && Math.random() < 0.008) {
        const idx = HEALTH_LEVELS.indexOf(n.health)
        if (idx > 0) n.health = HEALTH_LEVELS[idx - 1]
      }

      // Temperature fluctuation
      n.waterTemp += (Math.random() - 0.5) * 0.4

      // Growth rate improves with biodiversity
      if (n.biodiversity > 10 && Math.random() < 0.005) {
        n.growthRate = Math.min(1, n.growthRate + 0.02)
      }
    }

    // Remove dead nurseries over time
    for (let i = this.nurseries.length - 1; i >= 0; i--) {
      if (this.nurseries[i].health === 'dead' && Math.random() < 0.01) {
        this.nurseries.splice(i, 1)
      }
    }
  }

  getNurseries(): readonly CoralNursery[] { return this.nurseries }
}
