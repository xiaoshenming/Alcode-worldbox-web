// Creature Coopers System (v3.238) - Coopers craft barrels and casks
// Skilled woodworkers who build watertight containers for storage and transport

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type BarrelType = 'wine' | 'ale' | 'water' | 'provisions'

export interface Cooper {
  id: number
  entityId: number
  skill: number
  barrelsMade: number
  barrelType: BarrelType
  tightness: number
  durability: number
  tick: number
}

const CHECK_INTERVAL = 1350
const CRAFT_CHANCE = 0.006
const MAX_COOPERS = 36
const SKILL_GROWTH = 0.07

const BARREL_TYPES: BarrelType[] = ['wine', 'ale', 'water', 'provisions']

export class CreatureCoopersSystem {
  private coopers: Cooper[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.coopers.length >= MAX_COOPERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 8) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const barrelsMade = 1 + Math.floor(skill / 12)

      this.coopers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        barrelsMade,
        barrelType: BARREL_TYPES[typeIdx],
        tightness: 30 + skill * 0.6,
        durability: 25 + skill * 0.65,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.coopers.length - 1; i >= 0; i--) {
      if (this.coopers[i].tick < cutoff) this.coopers.splice(i, 1)
    }
  }

  getCoopers(): Cooper[] { return this.coopers }
}
