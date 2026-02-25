// Creature Trapper System (v3.156) - Creatures set traps to capture prey
// Skilled trappers place bait, set snares, and improve their technique over time

import { EntityManager } from '../ecs/Entity'

export type BaitType = 'meat' | 'grain' | 'insect' | 'fish' | 'berry'

export interface Trapper {
  id: number
  entityId: number
  trapsSet: number
  trapsCaught: number
  skill: number
  baitType: BaitType
  territory: number
  tick: number
}

const CHECK_INTERVAL = 3500
const SPAWN_CHANCE = 0.003
const MAX_TRAPPERS = 12

const BAIT_TYPES: BaitType[] = ['meat', 'grain', 'insect', 'fish', 'berry']
const BAIT_EFFECTIVENESS: Record<BaitType, number> = {
  meat: 0.35, grain: 0.20, insect: 0.15, fish: 0.30, berry: 0.25,
}

export class CreatureTrapperSystem {
  private trappers: Trapper[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Recruit new trappers from existing creatures
    if (this.trappers.length < MAX_TRAPPERS && Math.random() < SPAWN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const already = this.trappers.some(t => t.entityId === eid)
        if (!already) {
          const bait = BAIT_TYPES[Math.floor(Math.random() * BAIT_TYPES.length)]
          this.trappers.push({
            id: this.nextId++,
            entityId: eid,
            trapsSet: 0,
            trapsCaught: 0,
            skill: 5 + Math.random() * 15,
            baitType: bait,
            territory: 3 + Math.floor(Math.random() * 5),
            tick,
          })
        }
      }
    }

    // Trappers attempt to set and check traps
    for (const t of this.trappers) {
      // Set new traps based on skill
      if (Math.random() < 0.02 * (t.skill / 50)) {
        t.trapsSet++
      }

      // Check existing traps for catches
      if (t.trapsSet > 0 && Math.random() < 0.01) {
        const catchChance = BAIT_EFFECTIVENESS[t.baitType] * (t.skill / 100)
        if (Math.random() < catchChance) {
          t.trapsCaught++
          t.trapsSet = Math.max(0, t.trapsSet - 1)
          t.skill = Math.min(100, t.skill + 0.5)
        }
      }

      // Occasionally switch bait type to improve results
      if (t.trapsCaught > 0 && t.trapsSet > 5 && Math.random() < 0.005) {
        t.baitType = BAIT_TYPES[Math.floor(Math.random() * BAIT_TYPES.length)]
      }
    }

    // Remove trappers whose creatures no longer exist
    const alive = new Set(em.getEntitiesWithComponent('creature'))
    for (let i = this.trappers.length - 1; i >= 0; i--) {
      if (!alive.has(this.trappers[i].entityId)) this.trappers.splice(i, 1)
    }
  }

  getTrappers(): readonly Trapper[] { return this.trappers }
}
