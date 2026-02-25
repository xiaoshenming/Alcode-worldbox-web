// Creature Buckle Makers System (v3.374) - Buckle crafting artisans
// Metalworkers who forge decorative and functional buckles for belts and armor

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type BuckleType = 'belt' | 'shoe' | 'armor' | 'ornamental'

export interface BuckleMaker {
  id: number
  entityId: number
  skill: number
  bucklesMade: number
  buckleType: BuckleType
  craftsmanship: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1440
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.057

const BUCKLE_TYPES: BuckleType[] = ['belt', 'shoe', 'armor', 'ornamental']

export class CreatureBuckleMakersSystem {
  private makers: BuckleMaker[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.makers.length >= MAX_MAKERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 7)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const bucklesMade = 1 + Math.floor(skill / 9)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        bucklesMade,
        buckleType: BUCKLE_TYPES[typeIdx],
        craftsmanship: 14 + skill * 0.72,
        reputation: 10 + skill * 0.81,
        tick,
      })
    }

    const cutoff = tick - 52000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): BuckleMaker[] { return this.makers }
}
