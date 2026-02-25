// Creature Shuttle Makers System (v3.395) - Shuttle crafting artisans
// Woodworkers who carve and polish weaving shuttles for looms

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type ShuttleType = 'fly' | 'boat' | 'stick' | 'rag'

export interface ShuttleMaker {
  id: number
  entityId: number
  skill: number
  shuttlesMade: number
  shuttleType: ShuttleType
  aerodynamics: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1470
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.053

const SHUTTLE_TYPES: ShuttleType[] = ['fly', 'boat', 'stick', 'rag']

export class CreatureShuttleMakersSystem {
  private makers: ShuttleMaker[] = []
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
      const shuttlesMade = 2 + Math.floor(skill / 8)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        shuttlesMade,
        shuttleType: SHUTTLE_TYPES[typeIdx],
        aerodynamics: 13 + skill * 0.75,
        reputation: 10 + skill * 0.81,
        tick,
      })
    }

    const cutoff = tick - 52000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): ShuttleMaker[] { return this.makers }
}
