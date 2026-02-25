// Creature Macramé Makers System (v3.416) - Macramé knotting artisans
// Skilled workers who create decorative knotted textiles and hangings

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type MacrameType = 'wall_hanging' | 'plant_hanger' | 'curtain' | 'belt'

export interface MacrameMaker {
  id: number
  entityId: number
  skill: number
  piecesMade: number
  macrameType: MacrameType
  knotDensity: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1510
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.054

const MACRAME_TYPES: MacrameType[] = ['wall_hanging', 'plant_hanger', 'curtain', 'belt']

export class CreatureMacrameMakersSystem {
  private makers: MacrameMaker[] = []
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
      const piecesMade = 2 + Math.floor(skill / 8)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        piecesMade,
        macrameType: MACRAME_TYPES[typeIdx],
        knotDensity: 12 + skill * 0.72,
        reputation: 10 + skill * 0.81,
        tick,
      })
    }

    const cutoff = tick - 53000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): MacrameMaker[] { return this.makers }
}
