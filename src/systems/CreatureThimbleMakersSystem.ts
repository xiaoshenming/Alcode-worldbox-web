// Creature Thimble Makers System (v3.368) - Thimble crafting artisans
// Artisans who craft protective thimbles for sewing from metal and leather

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type ThimbleMaterial = 'brass' | 'silver' | 'steel' | 'leather'

export interface ThimbleMaker {
  id: number
  entityId: number
  skill: number
  thimblesMade: number
  material: ThimbleMaterial
  fitPrecision: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1360
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.056

const MATERIALS: ThimbleMaterial[] = ['brass', 'silver', 'steel', 'leather']

export class CreatureThimbleMakersSystem {
  private makers: ThimbleMaker[] = []
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

      const matIdx = Math.min(3, Math.floor(skill / 25))
      const thimblesMade = 2 + Math.floor(skill / 6)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        thimblesMade,
        material: MATERIALS[matIdx],
        fitPrecision: 16 + skill * 0.72,
        reputation: 10 + skill * 0.8,
        tick,
      })
    }

    const cutoff = tick - 50000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

}
