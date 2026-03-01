// Creature Bookbinders System (v3.338) - Book binding craftsmen
// Artisans who bind pages into books using various techniques

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type BindingStyle = 'coptic' | 'perfect' | 'saddle' | 'case'

export interface Bookbinder {
  id: number
  entityId: number
  skill: number
  booksBound: number
  bindingStyle: BindingStyle
  durability: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1360
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.058

const STYLES: BindingStyle[] = ['coptic', 'perfect', 'saddle', 'case']

export class CreatureBookbindersSystem {
  private makers: Bookbinder[] = []
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

      const styleIdx = Math.min(3, Math.floor(skill / 25))
      const booksBound = 1 + Math.floor(skill / 8)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        booksBound,
        bindingStyle: STYLES[styleIdx],
        durability: 20 + skill * 0.7,
        reputation: 10 + skill * 0.83,
        tick,
      })
    }

    const cutoff = tick - 51000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

}
