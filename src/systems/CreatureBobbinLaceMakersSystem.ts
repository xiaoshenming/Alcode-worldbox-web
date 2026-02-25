// Creature Bobbin Lace Makers System (v3.398) - Bobbin lace artisans
// Skilled lace makers who create intricate patterns by braiding threads on bobbins

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type LacePattern = 'torchon' | 'cluny' | 'bruges' | 'honiton'

export interface BobbinLaceMaker {
  id: number
  entityId: number
  skill: number
  lacePiecesMade: number
  pattern: LacePattern
  intricacy: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1480
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.052

const PATTERNS: LacePattern[] = ['torchon', 'cluny', 'bruges', 'honiton']

export class CreatureBobbinLaceMakersSystem {
  private makers: BobbinLaceMaker[] = []
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
      const lacePiecesMade = 1 + Math.floor(skill / 10)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        lacePiecesMade,
        pattern: PATTERNS[typeIdx],
        intricacy: 12 + skill * 0.76,
        reputation: 10 + skill * 0.83,
        tick,
      })
    }

    const cutoff = tick - 52000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): BobbinLaceMaker[] { return this.makers }
}
