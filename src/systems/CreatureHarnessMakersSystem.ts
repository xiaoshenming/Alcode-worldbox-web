// Creature Harness Makers System (v3.320) - Harness and tack craftsmen
// Artisans who craft leather harnesses, bridles, and tack for working animals

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type HarnessType = 'draft' | 'riding' | 'pack' | 'ceremonial'

export interface HarnessMaker {
  id: number
  entityId: number
  skill: number
  harnessessMade: number
  harnessType: HarnessType
  leatherwork: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.063

const HARNESS_TYPES: HarnessType[] = ['draft', 'riding', 'pack', 'ceremonial']

export class CreatureHarnessMakersSystem {
  private makers: HarnessMaker[] = []
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
      const harnessessMade = 1 + Math.floor(skill / 10)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        harnessessMade,
        harnessType: HARNESS_TYPES[typeIdx],
        leatherwork: 15 + skill * 0.68,
        reputation: 10 + skill * 0.78,
        tick,
      })
    }

    const cutoff = tick - 50000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

}
