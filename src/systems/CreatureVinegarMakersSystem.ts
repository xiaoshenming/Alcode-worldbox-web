// Creature Vinegar Makers System (v3.323) - Vinegar production craftsmen
// Artisans who ferment and age vinegar from various fruits and grains

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type VinegarBase = 'apple' | 'grape' | 'grain' | 'honey'

export interface VinegarMaker {
  id: number
  entityId: number
  skill: number
  batchesBrewed: number
  vinegarBase: VinegarBase
  acidity: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1380
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.059

const VINEGAR_BASES: VinegarBase[] = ['apple', 'grape', 'grain', 'honey']

export class CreatureVinegarMakersSystem {
  private makers: VinegarMaker[] = []
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

      const baseIdx = Math.min(3, Math.floor(skill / 25))
      const batchesBrewed = 1 + Math.floor(skill / 8)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        batchesBrewed,
        vinegarBase: VINEGAR_BASES[baseIdx],
        acidity: 10 + skill * 0.72,
        reputation: 10 + skill * 0.76,
        tick,
      })
    }

    const cutoff = tick - 49000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

}
