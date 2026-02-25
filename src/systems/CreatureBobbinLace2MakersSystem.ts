// Creature Bobbin Lace Makers System (v3.437) - Bobbin lace artisans
// Skilled workers who create lace by braiding threads wound on bobbins

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type BobbinLace2Type = 'torchon' | 'cluny' | 'bruges' | 'honiton'

export interface BobbinLace2Maker {
  id: number
  entityId: number
  skill: number
  piecesMade: number
  laceType: BobbinLace2Type
  threadCount: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1540
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.051

const LACE_TYPES: BobbinLace2Type[] = ['torchon', 'cluny', 'bruges', 'honiton']

export class CreatureBobbinLace2MakersSystem {
  private makers: BobbinLace2Maker[] = []
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
      const piecesMade = 2 + Math.floor(skill / 9)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        piecesMade,
        laceType: LACE_TYPES[typeIdx],
        threadCount: 8 + Math.floor(skill * 0.85),
        reputation: 10 + skill * 0.80,
        tick,
      })
    }

    const cutoff = tick - 53000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): BobbinLace2Maker[] { return this.makers }
}
