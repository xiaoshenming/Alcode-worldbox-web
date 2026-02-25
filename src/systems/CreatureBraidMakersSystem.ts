// Creature Braid Makers System (v3.413) - Braid crafting artisans
// Skilled workers who create braided cords, trims, and decorative bands

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type BraidType = 'cord' | 'trim' | 'soutache' | 'gimp'

export interface BraidMaker {
  id: number
  entityId: number
  skill: number
  braidsMade: number
  braidType: BraidType
  tension: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1480
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.052

const BRAID_TYPES: BraidType[] = ['cord', 'trim', 'soutache', 'gimp']

export class CreatureBraidMakersSystem {
  private makers: BraidMaker[] = []
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
      const braidsMade = 3 + Math.floor(skill / 7)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        braidsMade,
        braidType: BRAID_TYPES[typeIdx],
        tension: 14 + skill * 0.74,
        reputation: 10 + skill * 0.79,
        tick,
      })
    }

    const cutoff = tick - 52000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): BraidMaker[] { return this.makers }
}
