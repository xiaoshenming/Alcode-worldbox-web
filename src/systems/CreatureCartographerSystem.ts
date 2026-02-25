// Creature Cartographer System (v3.203) - Cartographers map terrain and trade routes
// Maps improve navigation, trade efficiency, and territorial awareness

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type MapType = 'terrain' | 'trade' | 'military' | 'nautical'

export interface Cartographer {
  id: number
  entityId: number
  skill: number
  mapsDrawn: number
  mapType: MapType
  accuracy: number
  coverage: number
  tick: number
}

const CHECK_INTERVAL = 1500
const CRAFT_CHANCE = 0.004
const MAX_CARTOGRAPHERS = 35
const SKILL_GROWTH = 0.07

const MAP_TYPES: MapType[] = ['terrain', 'trade', 'military', 'nautical']

export class CreatureCartographerSystem {
  private cartographers: Cartographer[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.cartographers.length >= MAX_CARTOGRAPHERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 15) continue

      let skill = this.skillMap.get(eid) ?? (5 + Math.random() * 10)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const mapType = MAP_TYPES[Math.floor(Math.random() * MAP_TYPES.length)]
      const mapsDrawn = 1 + Math.floor(skill / 15)
      const accuracy = 20 + skill * 0.7 + Math.random() * 10
      const coverage = 10 + skill * 0.5 + mapsDrawn * 3

      this.cartographers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        mapsDrawn,
        mapType,
        accuracy: Math.min(100, accuracy),
        coverage: Math.min(100, coverage),
        tick,
      })
    }

    const cutoff = tick - 48000
    for (let i = this.cartographers.length - 1; i >= 0; i--) {
      if (this.cartographers[i].tick < cutoff) {
        this.cartographers.splice(i, 1)
      }
    }
  }

  getCartographers(): readonly Cartographer[] { return this.cartographers }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
