// Creature Wainwrights System (v3.266) - Wagon and cart builders
// Craftsmen who construct wheeled vehicles for transport and trade

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type WagonType = 'handcart' | 'oxcart' | 'wagon' | 'chariot'

export interface Wainwright {
  id: number
  entityId: number
  skill: number
  wagonsBuilt: number
  wagonType: WagonType
  durability: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1500
const CRAFT_CHANCE = 0.005
const MAX_WAINWRIGHTS = 32
const SKILL_GROWTH = 0.06

const WAGON_TYPES: WagonType[] = ['handcart', 'oxcart', 'wagon', 'chariot']

export class CreatureWainwrightsSystem {
  private wainwrights: Wainwright[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.wainwrights.length >= MAX_WAINWRIGHTS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 13) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 7)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const wagonsBuilt = 1 + Math.floor(skill / 10)

      this.wainwrights.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        wagonsBuilt,
        wagonType: WAGON_TYPES[typeIdx],
        durability: 25 + skill * 0.65,
        reputation: 10 + skill * 0.8,
        tick,
      })
    }

    const cutoff = tick - 56000
    for (let i = this.wainwrights.length - 1; i >= 0; i--) {
      if (this.wainwrights[i].tick < cutoff) this.wainwrights.splice(i, 1)
    }
  }

  getWainwrights(): Wainwright[] { return this.wainwrights }
}
