// Creature Tassel Makers System (v3.410) - Tassel crafting artisans
// Craftspeople who create ornamental tassels for clothing, curtains, and regalia

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type TasselType = 'silk' | 'wool' | 'metallic' | 'ceremonial'

export interface TasselMaker {
  id: number
  entityId: number
  skill: number
  tasselsMade: number
  tasselType: TasselType
  symmetry: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1470
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.053

const TASSEL_TYPES: TasselType[] = ['silk', 'wool', 'metallic', 'ceremonial']

export class CreatureTasselMakersSystem {
  private makers: TasselMaker[] = []
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
      const tasselsMade = 4 + Math.floor(skill / 6)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        tasselsMade,
        tasselType: TASSEL_TYPES[typeIdx],
        symmetry: 15 + skill * 0.72,
        reputation: 10 + skill * 0.81,
        tick,
      })
    }

    const cutoff = tick - 52000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

}
