// Creature Fuller System (v3.231) - Fullers clean and thicken cloth
// Textile workers who process woven fabric by pounding and washing

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type ClothType = 'wool' | 'linen' | 'cotton' | 'silk'

export interface Fuller {
  id: number
  entityId: number
  skill: number
  boltsProcessed: number
  clothType: ClothType
  thickness: number
  softness: number
  tick: number
}

const CHECK_INTERVAL = 1350
const CRAFT_CHANCE = 0.006
const MAX_FULLERS = 36
const SKILL_GROWTH = 0.07

const CLOTH_TYPES: ClothType[] = ['wool', 'linen', 'cotton', 'silk']

export class CreatureFullerSystem {
  private fullers: Fuller[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.fullers.length >= MAX_FULLERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 9) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const clothIdx = Math.min(3, Math.floor(skill / 25))
      const boltsProcessed = 1 + Math.floor(skill / 14)
      const thickness = 10 + skill * 0.6 + Math.random() * 15

      this.fullers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        boltsProcessed,
        clothType: CLOTH_TYPES[clothIdx],
        thickness: Math.min(100, thickness),
        softness: 8 + skill * 0.75 + Math.random() * 12,
        tick,
      })
    }

    const cutoff = tick - 45000
    for (let i = this.fullers.length - 1; i >= 0; i--) {
      if (this.fullers[i].tick < cutoff) {
        this.fullers.splice(i, 1)
      }
    }
  }

  getFullers(): readonly Fuller[] { return this.fullers }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
