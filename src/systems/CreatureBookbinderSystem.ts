// Creature Bookbinder System (v3.226) - Bookbinders craft bound volumes
// Artisans who stitch, glue, and bind pages into durable books and manuscripts

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type BindingStyle = 'coptic' | 'perfect' | 'saddle_stitch' | 'leather_bound'

export interface Bookbinder {
  id: number
  entityId: number
  skill: number
  booksBound: number
  style: BindingStyle
  pageCount: number
  durability: number
  tick: number
}

const CHECK_INTERVAL = 1300
const CRAFT_CHANCE = 0.005
const MAX_BOOKBINDERS = 38
const SKILL_GROWTH = 0.07

const STYLES: BindingStyle[] = ['coptic', 'perfect', 'saddle_stitch', 'leather_bound']

export class CreatureBookbinderSystem {
  private bookbinders: Bookbinder[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.bookbinders.length >= MAX_BOOKBINDERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 14) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const styleIdx = Math.min(3, Math.floor(skill / 25))
      const booksBound = 1 + Math.floor(skill / 15)
      const pageCount = 20 + Math.floor(skill * 3) + Math.floor(Math.random() * 50)

      this.bookbinders.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        booksBound,
        style: STYLES[styleIdx],
        pageCount: Math.min(500, pageCount),
        durability: 15 + skill * 0.7 + Math.random() * 10,
        tick,
      })
    }

    const cutoff = tick - 45000
    for (let i = this.bookbinders.length - 1; i >= 0; i--) {
      if (this.bookbinders[i].tick < cutoff) {
        this.bookbinders.splice(i, 1)
      }
    }
  }

}
