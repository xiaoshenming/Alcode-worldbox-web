// World Coral Reef Growth System (v3.124) - Expanding coral reef ecosystems
// Coral reefs grow in shallow water, supporting marine biodiversity

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type CoralType = 'brain' | 'staghorn' | 'fan' | 'table' | 'pillar'

export interface CoralReef {
  id: number
  x: number
  y: number
  coralType: CoralType
  coverage: number
  biodiversity: number
  health: number
  growthRate: number
  tick: number
}

const CHECK_INTERVAL = 4500
const GROW_CHANCE = 0.003
const MAX_REEFS = 12

const TYPES: CoralType[] = ['brain', 'staghorn', 'fan', 'table', 'pillar']
const TYPE_GROWTH: Record<CoralType, number> = {
  brain: 0.3, staghorn: 0.8, fan: 0.5, table: 0.6, pillar: 0.4,
}

export class WorldCoralReefGrowthSystem {
  private reefs: CoralReef[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.reefs.length < MAX_REEFS && Math.random() < GROW_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      // Grow in shallow water
      if (tile != null && tile === 1) {
        const ct = TYPES[Math.floor(Math.random() * TYPES.length)]
        this.reefs.push({
          id: this.nextId++,
          x, y,
          coralType: ct,
          coverage: 5 + Math.floor(Math.random() * 10),
          biodiversity: 10 + Math.floor(Math.random() * 20),
          health: 80 + Math.floor(Math.random() * 20),
          growthRate: TYPE_GROWTH[ct],
          tick,
        })
      }
    }

    for (const r of this.reefs) {
      // Coral grows over time
      if (r.health > 50) {
        r.coverage = Math.min(100, r.coverage + r.growthRate * 0.01)
        r.biodiversity = Math.min(100, r.biodiversity + 0.005)
      }
      // Health degrades slowly
      const age = tick - r.tick
      if (age > 120000) {
        r.health = Math.max(10, r.health - 0.02)
      }
    }

    // Remove dead reefs
    for (let i = this.reefs.length - 1; i >= 0; i--) {
      if (this.reefs[i].health <= 10 && this.reefs[i].coverage < 5) {
        this.reefs.splice(i, 1)
      }
    }
  }

}
