// Creature Clasp Makers System (v3.377) - Clasp crafting artisans
// Skilled metalworkers who create clasps for cloaks, jewelry, and books

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type ClaspType = 'cloak' | 'jewelry' | 'book' | 'chest'

export interface ClaspMaker {
  id: number
  entityId: number
  skill: number
  claspsMade: number
  claspType: ClaspType
  precision: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1450
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.055

const CLASP_TYPES: ClaspType[] = ['cloak', 'jewelry', 'book', 'chest']

export class CreatureClaspMakersSystem {
  private makers: ClaspMaker[] = []
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
      const claspsMade = 1 + Math.floor(skill / 8)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        claspsMade,
        claspType: CLASP_TYPES[typeIdx],
        precision: 16 + skill * 0.70,
        reputation: 10 + skill * 0.79,
        tick,
      })
    }

    const cutoff = tick - 52000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

}
