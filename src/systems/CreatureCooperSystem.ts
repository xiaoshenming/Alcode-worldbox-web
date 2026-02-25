// Creature Cooper System (v3.183) - Barrel-making craftspeople
// Creatures craft wooden barrels for storing food and liquids

import { EntityManager } from '../ecs/Entity'

export type WoodType = 'oak' | 'pine' | 'cedar' | 'birch'

export interface Cooper {
  id: number
  entityId: number
  skill: number
  barrelsProduced: number
  quality: number
  woodType: WoodType
  repairsDone: number
  tick: number
}

const CHECK_INTERVAL = 3100
const SPAWN_CHANCE = 0.003
const MAX_COOPERS = 10

const WOOD_TYPES: WoodType[] = ['oak', 'pine', 'cedar', 'birch']
const WOOD_DURABILITY: Record<WoodType, number> = {
  oak: 1.0, pine: 0.6, cedar: 0.8, birch: 0.5,
}

export class CreatureCooperSystem {
  private coopers: Cooper[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Recruit new coopers
    if (this.coopers.length < MAX_COOPERS && Math.random() < SPAWN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        if (!this.coopers.some(c => c.entityId === eid)) {
          const wood = WOOD_TYPES[Math.floor(Math.random() * WOOD_TYPES.length)]
          this.coopers.push({
            id: this.nextId++, entityId: eid,
            skill: 5 + Math.random() * 15,
            barrelsProduced: 0,
            quality: 0.2 + Math.random() * 0.3,
            woodType: wood,
            repairsDone: 0, tick,
          })
        }
      }
    }

    for (const c of this.coopers) {
      const durability = WOOD_DURABILITY[c.woodType]

      // Produce barrels
      if (Math.random() < c.skill / 100 * 0.05) {
        c.barrelsProduced++
        c.quality = Math.min(1, c.quality + 0.005 * durability)
        c.skill = Math.min(100, c.skill + 0.12)
      }

      // Repair existing barrels
      if (c.barrelsProduced > 0 && Math.random() < 0.03) {
        c.repairsDone++
        c.skill = Math.min(100, c.skill + 0.08)
      }

      // Upgrade wood type with mastery
      if (c.skill > 65 && Math.random() < 0.003) {
        const idx = WOOD_TYPES.indexOf(c.woodType)
        if (idx < WOOD_TYPES.length - 1) c.woodType = WOOD_TYPES[idx + 1]
      }
    }

    // Remove coopers whose creatures no longer exist
    const alive = new Set(em.getEntitiesWithComponent('creature'))
    for (let i = this.coopers.length - 1; i >= 0; i--) {
      if (!alive.has(this.coopers[i].entityId)) this.coopers.splice(i, 1)
    }
  }

  getCoopers(): readonly Cooper[] { return this.coopers }
}
