// Creature Wheelwright System (v3.193) - Wheelwrights build and repair wheels for carts and mills
// Essential for trade routes and agricultural processing

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type WheelType = 'cart' | 'mill' | 'war' | 'ceremonial'

export interface Wheelwright {
  id: number
  entityId: number
  skill: number
  wheelsBuilt: number
  repairsDone: number
  wheelType: WheelType
  durability: number
  tick: number
}

const CHECK_INTERVAL = 1300
const CRAFT_CHANCE = 0.005
const MAX_WHEELWRIGHTS = 45
const SKILL_GROWTH = 0.08

const WHEEL_TYPES: WheelType[] = ['cart', 'mill', 'war', 'ceremonial']

export class CreatureWheelwrightSystem {
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
      if (!c || c.age < 14) continue

      let skill = this.skillMap.get(eid) ?? (5 + Math.random() * 10)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const wheelType = WHEEL_TYPES[Math.floor(Math.random() * WHEEL_TYPES.length)]
      const wheelsBuilt = 1 + Math.floor(skill / 15)
      const repairsDone = Math.floor(skill / 8)
      const durability = 30 + skill * 0.6 + Math.random() * 10

      this.wheelwrights.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        wheelsBuilt,
        repairsDone,
        wheelType,
        durability: Math.min(100, durability),
        tick,
      })
    }

    const cutoff = tick - 44000
    for (let i = this.wheelwrights.length - 1; i >= 0; i--) {
      if (this.wheelwrights[i].tick < cutoff) {
        this.wheelwrights.splice(i, 1)
      }
    }
  }

  getWheelwrights(): readonly Wheelwright[] { return this.wheelwrights }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
