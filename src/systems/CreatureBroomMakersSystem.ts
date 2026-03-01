// Creature Broom Makers System (v3.298) - Broom and brush craftsmen
// Artisans who bind straw, twigs, and bristles into brooms and brushes

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type BroomType = 'straw' | 'twig' | 'bristle' | 'ceremonial'

export interface BroomMaker {
  id: number
  entityId: number
  skill: number
  broomsMade: number
  broomType: BroomType
  durability: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1350
const CRAFT_CHANCE = 0.006
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.07

const BROOM_TYPES: BroomType[] = ['straw', 'twig', 'bristle', 'ceremonial']

export class CreatureBroomMakersSystem {
  private makers: BroomMaker[] = []
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
      if (!c || c.age < 8) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 6)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const broomsMade = 2 + Math.floor(skill / 6)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        broomsMade,
        broomType: BROOM_TYPES[typeIdx],
        durability: 20 + skill * 0.65,
        reputation: 8 + skill * 0.7,
        tick,
      })
    }

    const cutoff = tick - 50000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

}
