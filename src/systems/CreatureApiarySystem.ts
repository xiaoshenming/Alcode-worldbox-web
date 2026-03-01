// Creature Apiary System (v3.111) - Beekeeping and honey production
// Creatures maintain apiaries that produce honey and pollinate nearby crops

import { EntityManager, EntityId } from '../ecs/Entity'

export type HiveHealth = 'thriving' | 'stable' | 'stressed' | 'collapsed'

export interface Apiary {
  id: number
  keeperId: EntityId
  x: number
  y: number
  hiveCount: number
  health: HiveHealth
  honeyStored: number
  pollinationRadius: number
  tick: number
}

const CHECK_INTERVAL = 2500
const BUILD_CHANCE = 0.004
const MAX_APIARIES = 20
const HONEY_RATE = 0.8

const HEALTH_LEVELS: HiveHealth[] = ['thriving', 'stable', 'stressed', 'collapsed']

export class CreatureApiarySystem {
  private apiaries: Apiary[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Build new apiaries
    if (this.apiaries.length < MAX_APIARIES && Math.random() < BUILD_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const pos = em.getComponent(eid, 'position') as { x: number; y: number } | undefined
        if (pos) {
          this.apiaries.push({
            id: this.nextId++,
            keeperId: eid,
            x: pos.x, y: pos.y,
            hiveCount: 1 + Math.floor(Math.random() * 3),
            health: 'stable',
            honeyStored: 0,
            pollinationRadius: 5 + Math.floor(Math.random() * 10),
            tick,
          })
        }
      }
    }

    // Update apiaries
    for (const a of this.apiaries) {
      if (a.health === 'collapsed') continue

      // Produce honey
      a.honeyStored = Math.min(200, a.honeyStored + HONEY_RATE * a.hiveCount)

      // Health fluctuation
      const roll = Math.random()
      if (roll < 0.02) {
        const idx = HEALTH_LEVELS.indexOf(a.health)
        if (roll < 0.01 && idx < 3) a.health = HEALTH_LEVELS[idx + 1]
        else if (idx > 0) a.health = HEALTH_LEVELS[idx - 1]
      }

      // Grow hives if thriving
      if (a.health === 'thriving' && Math.random() < 0.01) {
        a.hiveCount = Math.min(8, a.hiveCount + 1)
      }
    }

    // Remove collapsed apiaries
    const cutoff = tick - 100000
    for (let i = this.apiaries.length - 1; i >= 0; i--) {
      if (this.apiaries[i].health === 'collapsed' && this.apiaries[i].tick < cutoff) {
        this.apiaries.splice(i, 1)
      }
    }
  }

}
