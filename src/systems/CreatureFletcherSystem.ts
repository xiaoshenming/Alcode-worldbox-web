// Creature Fletcher System (v3.191) - Fletchers craft arrows and bows for hunters and armies
// Skilled fletchers produce higher quality projectiles with better accuracy

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type ArrowType = 'broadhead' | 'bodkin' | 'fire' | 'blunt'

export interface Fletcher {
  id: number
  entityId: number
  skill: number
  arrowsCrafted: number
  bowsMade: number
  arrowType: ArrowType
  accuracy: number
  tick: number
}

const CHECK_INTERVAL = 1100
const CRAFT_CHANCE = 0.006
const MAX_FLETCHERS = 55
const SKILL_GROWTH = 0.08

const ARROW_TYPES: ArrowType[] = ['broadhead', 'bodkin', 'fire', 'blunt']

export class CreatureFletcherSystem {
  private fletchers: Fletcher[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.fletchers.length >= MAX_FLETCHERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 11)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const arrowType = ARROW_TYPES[Math.floor(Math.random() * ARROW_TYPES.length)]
      const arrowsCrafted = 5 + Math.floor(skill / 5)
      const bowsMade = Math.floor(skill / 25)
      const accuracy = 20 + skill * 0.7 + Math.random() * 10

      this.fletchers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        arrowsCrafted,
        bowsMade,
        arrowType,
        accuracy: Math.min(100, accuracy),
        tick,
      })
    }

    const cutoff = tick - 42000
    for (let i = this.fletchers.length - 1; i >= 0; i--) {
      if (this.fletchers[i].tick < cutoff) {
        this.fletchers.splice(i, 1)
      }
    }
  }

  getFletchers(): readonly Fletcher[] { return this.fletchers }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
