// Creature Felting Makers System (v3.434) - Felting artisans
// Skilled workers who create fabric by matting and pressing wool fibers

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type FeltingType = 'wet_felting' | 'needle_felting' | 'nuno' | 'cobweb'

export interface FeltingMaker {
  id: number
  entityId: number
  skill: number
  piecesMade: number
  feltingType: FeltingType
  fiberDensity: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1480
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.052

const FELTING_TYPES: FeltingType[] = ['wet_felting', 'needle_felting', 'nuno', 'cobweb']

export class CreatureFeltingMakersSystem {
  private makers: FeltingMaker[] = []
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
      const piecesMade = 3 + Math.floor(skill / 8)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        piecesMade,
        feltingType: FELTING_TYPES[typeIdx],
        fiberDensity: 15 + skill * 0.69,
        reputation: 10 + skill * 0.79,
        tick,
      })
    }

    const cutoff = tick - 51000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

}
