// Creature Plasterers System (v3.248) - Plasterers apply wall and ceiling finishes
// Construction workers who smooth and decorate interior surfaces with plaster

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type PlasterType = 'lime' | 'gypsum' | 'clay' | 'decorative'

export interface Plasterer {
  id: number
  entityId: number
  skill: number
  wallsFinished: number
  plasterType: PlasterType
  smoothness: number
  durability: number
  tick: number
}

const CHECK_INTERVAL = 1350
const CRAFT_CHANCE = 0.006
const MAX_PLASTERERS = 36
const SKILL_GROWTH = 0.07

const PLASTER_TYPES: PlasterType[] = ['lime', 'gypsum', 'clay', 'decorative']

export class CreaturePlasterersSystem {
  private plasterers: Plasterer[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.plasterers.length >= MAX_PLASTERERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 8) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const wallsFinished = 1 + Math.floor(skill / 11)

      this.plasterers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        wallsFinished,
        plasterType: PLASTER_TYPES[typeIdx],
        smoothness: 25 + skill * 0.65,
        durability: 30 + skill * 0.6,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.plasterers.length - 1; i >= 0; i--) {
      if (this.plasterers[i].tick < cutoff) this.plasterers.splice(i, 1)
    }
  }

}
