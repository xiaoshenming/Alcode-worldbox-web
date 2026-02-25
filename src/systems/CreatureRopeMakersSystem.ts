// Creature Rope Makers System (v3.281) - Rope and cordage craftsmen
// Artisans who twist fibers into ropes, cords, and twine for various uses

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type RopeType = 'twine' | 'cord' | 'rope' | 'cable'

export interface RopeMaker {
  id: number
  entityId: number
  skill: number
  ropesProduced: number
  ropeType: RopeType
  tensileStrength: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.006
const MAX_MAKERS = 32
const SKILL_GROWTH = 0.065

const ROPE_TYPES: RopeType[] = ['twine', 'cord', 'rope', 'cable']

export class CreatureRopeMakersSystem {
  private makers: RopeMaker[] = []
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
      if (!c || c.age < 9) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 7)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const ropesProduced = 2 + Math.floor(skill / 7)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        ropesProduced,
        ropeType: ROPE_TYPES[typeIdx],
        tensileStrength: 20 + skill * 0.7,
        reputation: 10 + skill * 0.75,
        tick,
      })
    }

    const cutoff = tick - 52000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): RopeMaker[] { return this.makers }
}
