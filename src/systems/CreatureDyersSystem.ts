// Creature Dyers System (v3.317) - Fabric dyeing craftsmen
// Artisans who extract and apply natural dyes to textiles and leather

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type DyeSource = 'plant' | 'mineral' | 'insect' | 'shellfish'

export interface Dyer {
  id: number
  entityId: number
  skill: number
  batchesDyed: number
  dyeSource: DyeSource
  colorFastness: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1350
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.058

const DYE_SOURCES: DyeSource[] = ['plant', 'mineral', 'insect', 'shellfish']

export class CreatureDyersSystem {
  private makers: Dyer[] = []
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

      const srcIdx = Math.min(3, Math.floor(skill / 25))
      const batchesDyed = 1 + Math.floor(skill / 8)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        batchesDyed,
        dyeSource: DYE_SOURCES[srcIdx],
        colorFastness: 15 + skill * 0.7,
        reputation: 10 + skill * 0.75,
        tick,
      })
    }

    const cutoff = tick - 51000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

}
