// Creature Wheelers System (v3.293) - Wheel makers
// Craftsmen who build and repair wheels for carts, mills, and machinery

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type WheelType = 'cart' | 'mill' | 'spinning' | 'gear'

export interface Wheeler {
  id: number
  entityId: number
  skill: number
  wheelsBuilt: number
  wheelType: WheelType
  balance: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.005
const MAX_WHEELERS = 30
const SKILL_GROWTH = 0.065

const WHEEL_TYPES: WheelType[] = ['cart', 'mill', 'spinning', 'gear']

export class CreatureWheelersSystem {
  private wheelers: Wheeler[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.wheelers.length >= MAX_WHEELERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 12) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 7)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const wheelsBuilt = 1 + Math.floor(skill / 9)

      this.wheelers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        wheelsBuilt,
        wheelType: WHEEL_TYPES[typeIdx],
        balance: 20 + skill * 0.7,
        reputation: 12 + skill * 0.8,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.wheelers.length - 1; i >= 0; i--) {
      if (this.wheelers[i].tick < cutoff) this.wheelers.splice(i, 1)
    }
  }

  getWheelers(): Wheeler[] { return this.wheelers }
}
