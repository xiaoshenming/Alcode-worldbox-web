// Creature Fletchers System (v3.263) - Fletchers craft arrows and crossbow bolts
// Skilled artisans who shape shafts, attach feathers, and tip projectiles

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type ProjectileType = 'arrow' | 'bolt' | 'dart' | 'javelin'

export interface Fletcher {
  id: number
  entityId: number
  skill: number
  projectilesCrafted: number
  projectileType: ProjectileType
  accuracy: number
  penetration: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.006
const MAX_FLETCHERS = 34
const SKILL_GROWTH = 0.07

const PROJECTILE_TYPES: ProjectileType[] = ['arrow', 'bolt', 'dart', 'javelin']

export class CreatureFletchersSystem {
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
      if (!c || c.age < 9) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const projectilesCrafted = 2 + Math.floor(skill / 8)

      this.fletchers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        projectilesCrafted,
        projectileType: PROJECTILE_TYPES[typeIdx],
        accuracy: 25 + skill * 0.65,
        penetration: 20 + skill * 0.7,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.fletchers.length - 1; i >= 0; i--) {
      if (this.fletchers[i].tick < cutoff) this.fletchers.splice(i, 1)
    }
  }

  getFletchers(): Fletcher[] { return this.fletchers }
}
