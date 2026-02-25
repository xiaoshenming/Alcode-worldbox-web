// Creature Rivet Makers System (v3.380) - Rivet forging artisans
// Smiths who produce rivets for shipbuilding, armor, and construction

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type RivetType = 'ship' | 'armor' | 'bridge' | 'decorative'

export interface RivetMaker {
  id: number
  entityId: number
  skill: number
  rivetsMade: number
  rivetType: RivetType
  strength: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1460
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.054

const RIVET_TYPES: RivetType[] = ['ship', 'armor', 'bridge', 'decorative']

export class CreatureRivetMakersSystem {
  private makers: RivetMaker[] = []
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
      const rivetsMade = 3 + Math.floor(skill / 6)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        rivetsMade,
        rivetType: RIVET_TYPES[typeIdx],
        strength: 18 + skill * 0.68,
        reputation: 10 + skill * 0.77,
        tick,
      })
    }

    const cutoff = tick - 52000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): RivetMaker[] { return this.makers }
}
