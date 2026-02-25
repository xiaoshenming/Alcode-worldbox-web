// Creature Crochet Makers System (v3.431) - Crochet artisans
// Skilled workers who create interlocking loops of yarn with hooked needles

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type CrochetType = 'amigurumi' | 'filet' | 'tunisian' | 'irish'

export interface CrochetMaker {
  id: number
  entityId: number
  skill: number
  piecesMade: number
  crochetType: CrochetType
  loopTension: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1530
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.053

const CROCHET_TYPES: CrochetType[] = ['amigurumi', 'filet', 'tunisian', 'irish']

export class CreatureCrochetMakersSystem {
  private makers: CrochetMaker[] = []
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
      const piecesMade = 3 + Math.floor(skill / 7)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        piecesMade,
        crochetType: CROCHET_TYPES[typeIdx],
        loopTension: 14 + skill * 0.72,
        reputation: 10 + skill * 0.82,
        tick,
      })
    }

    const cutoff = tick - 52000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): CrochetMaker[] { return this.makers }
}
