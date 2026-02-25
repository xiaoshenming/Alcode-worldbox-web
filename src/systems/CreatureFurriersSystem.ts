// Creature Furriers System (v3.332) - Fur trading craftsmen
// Artisans who process, treat, and craft garments from animal pelts

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type FurType = 'fox' | 'beaver' | 'mink' | 'ermine'

export interface Furrier {
  id: number
  entityId: number
  skill: number
  peltsProcessed: number
  furType: FurType
  tanningQuality: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1420
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.061

const FUR_TYPES: FurType[] = ['fox', 'beaver', 'mink', 'ermine']

export class CreatureFurriersSystem {
  private makers: Furrier[] = []
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
      const peltsProcessed = 1 + Math.floor(skill / 8)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        peltsProcessed,
        furType: FUR_TYPES[typeIdx],
        tanningQuality: 16 + skill * 0.68,
        reputation: 10 + skill * 0.8,
        tick,
      })
    }

    const cutoff = tick - 54000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): Furrier[] { return this.makers }
}
