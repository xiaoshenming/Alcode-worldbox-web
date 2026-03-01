// Creature Glazers System (v3.246) - Glazers install and craft window glass
// Artisans who cut, shape, and fit glass panes into buildings and decorative works

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type GlassType = 'clear' | 'colored' | 'stained' | 'leaded'

export interface Glazer {
  id: number
  entityId: number
  skill: number
  panesInstalled: number
  glassType: GlassType
  clarity: number
  artistry: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.006
const MAX_GLAZERS = 34
const SKILL_GROWTH = 0.07

const GLASS_TYPES: GlassType[] = ['clear', 'colored', 'stained', 'leaded']

export class CreatureGlazersSystem {
  private glazers: Glazer[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.glazers.length >= MAX_GLAZERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 9) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const panesInstalled = 1 + Math.floor(skill / 12)

      this.glazers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        panesInstalled,
        glassType: GLASS_TYPES[typeIdx],
        clarity: 30 + skill * 0.6,
        artistry: 15 + skill * 0.75,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.glazers.length - 1; i >= 0; i--) {
      if (this.glazers[i].tick < cutoff) this.glazers.splice(i, 1)
    }
  }

}
