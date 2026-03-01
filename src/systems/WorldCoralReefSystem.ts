// World Coral Reef System (v3.92) - Underwater coral reef ecosystems
// Coral reefs form in shallow waters, boosting biodiversity and marine life

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type CoralType = 'brain' | 'staghorn' | 'fan' | 'table' | 'pillar'

export interface CoralReef {
  id: number
  x: number
  y: number
  type: CoralType
  health: number
  growth: number
  biodiversity: number
  tick: number
}

const CHECK_INTERVAL = 2000
const SPAWN_CHANCE = 0.004
const MAX_REEFS = 40
const GROWTH_RATE = 0.02

const CORAL_TYPES: CoralType[] = ['brain', 'staghorn', 'fan', 'table', 'pillar']

const BIODIVERSITY_BONUS: Record<CoralType, number> = {
  brain: 15, staghorn: 25, fan: 20, table: 30, pillar: 10,
}

export class WorldCoralReefSystem {
  private reefs: CoralReef[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Spawn new reefs in shallow water
    if (this.reefs.length < MAX_REEFS && Math.random() < SPAWN_CHANCE) {
      const x = Math.floor(Math.random() * world.width)
      const y = Math.floor(Math.random() * world.height)
      const tile = world.getTile(x, y)

      if (tile === 1 || tile === 2) {
        const type = CORAL_TYPES[Math.floor(Math.random() * CORAL_TYPES.length)]
        this.reefs.push({
          id: this.nextId++,
          x, y, type,
          health: 60 + Math.random() * 40,
          growth: GROWTH_RATE + Math.random() * 0.02,
          biodiversity: 20 + BIODIVERSITY_BONUS[type],
          tick,
        })
      }
    }

    // Update existing reefs
    for (let i = this.reefs.length - 1; i >= 0; i--) {
      const r = this.reefs[i]

      r.growth = Math.min(1, r.growth + GROWTH_RATE * 0.1)
      r.biodiversity = Math.min(100, r.biodiversity + r.growth * 0.5)
      r.health += (Math.random() - 0.45) * 3
      r.health = Math.max(0, Math.min(100, r.health))

      // Check tile still water
      const tile = world.getTile(r.x, r.y)
      if (tile !== 1 && tile !== 2) {
        r.health -= 5
      }

      if (r.health <= 0) {
        this.reefs.splice(i, 1)
      }
    }
  }

  getReefAt(x: number, y: number): CoralReef | undefined {
    return this.reefs.find(r => Math.abs(r.x - x) <= 2 && Math.abs(r.y - y) <= 2)
  }
}
