// Creature Basket Weavers System (v3.306) - Basket weaving craftsmen
// Artisans who weave reeds, willow, and grasses into baskets and containers

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type BasketType = 'storage' | 'carrying' | 'fishing' | 'decorative'

export interface BasketWeaver {
  id: number
  entityId: number
  skill: number
  basketsMade: number
  basketType: BasketType
  tightness: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1350
const CRAFT_CHANCE = 0.006
const MAX_WEAVERS = 32
const SKILL_GROWTH = 0.07

const BASKET_TYPES: BasketType[] = ['storage', 'carrying', 'fishing', 'decorative']

export class CreatureBasketWeaversSystem {
  private weavers: BasketWeaver[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.weavers.length >= MAX_WEAVERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 9) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 6)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const basketsMade = 2 + Math.floor(skill / 7)

      this.weavers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        basketsMade,
        basketType: BASKET_TYPES[typeIdx],
        tightness: 15 + skill * 0.7,
        reputation: 8 + skill * 0.75,
        tick,
      })
    }

    const cutoff = tick - 51000
    for (let i = this.weavers.length - 1; i >= 0; i--) {
      if (this.weavers[i].tick < cutoff) this.weavers.splice(i, 1)
    }
  }

}
