// Creature Wheelwrights System (v3.253) - Wheelwrights build and repair wheels
// Craftsmen who construct wooden wheels for carts, wagons, and machinery

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type WheelType = 'cart' | 'wagon' | 'mill' | 'chariot'

export interface Wheelwright {
  id: number
  entityId: number
  skill: number
  wheelsBuilt: number
  wheelType: WheelType
  durability: number
  efficiency: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.006
const MAX_WHEELWRIGHTS = 34
const SKILL_GROWTH = 0.07

const WHEEL_TYPES: WheelType[] = ['cart', 'wagon', 'mill', 'chariot']

export class CreatureWheelwrightsSystem {
  private wheelwrights: Wheelwright[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.wheelwrights.length >= MAX_WHEELWRIGHTS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 8) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const wheelsBuilt = 1 + Math.floor(skill / 11)

      this.wheelwrights.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        wheelsBuilt,
        wheelType: WHEEL_TYPES[typeIdx],
        durability: 30 + skill * 0.6,
        efficiency: 20 + skill * 0.7,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.wheelwrights.length - 1; i >= 0; i--) {
      if (this.wheelwrights[i].tick < cutoff) this.wheelwrights.splice(i, 1)
    }
  }

}
