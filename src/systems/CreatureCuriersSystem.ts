// Creature Curiers System (v3.268) - Leather curers and tanners
// Artisans who prepare and cure animal hides into usable leather

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type LeatherGrade = 'rawhide' | 'tanned' | 'tooled' | 'fine'

export interface Curier {
  id: number
  entityId: number
  skill: number
  hidesCured: number
  leatherGrade: LeatherGrade
  quality: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1350
const CRAFT_CHANCE = 0.006
const MAX_CURIERS = 30
const SKILL_GROWTH = 0.065

const GRADES: LeatherGrade[] = ['rawhide', 'tanned', 'tooled', 'fine']

export class CreatureCuriersSystem {
  private curiers: Curier[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.curiers.length >= MAX_CURIERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const gradeIdx = Math.min(3, Math.floor(skill / 25))
      const hidesCured = 1 + Math.floor(skill / 8)

      this.curiers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        hidesCured,
        leatherGrade: GRADES[gradeIdx],
        quality: 20 + skill * 0.7,
        reputation: 12 + skill * 0.75,
        tick,
      })
    }

    const cutoff = tick - 54000
    for (let i = this.curiers.length - 1; i >= 0; i--) {
      if (this.curiers[i].tick < cutoff) this.curiers.splice(i, 1)
    }
  }

  getCuriers(): Curier[] { return this.curiers }
}
