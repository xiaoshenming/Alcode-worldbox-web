// Creature Tinsmiths System (v3.303) - Tin and pewter workers
// Craftsmen who shape tin and pewter into utensils, containers, and decorations

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type TinProduct = 'plate' | 'cup' | 'lantern' | 'canister'

export interface Tinsmith {
  id: number
  entityId: number
  skill: number
  itemsMade: number
  product: TinProduct
  finishQuality: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.005
const MAX_TINSMITHS = 32
const SKILL_GROWTH = 0.065

const PRODUCTS: TinProduct[] = ['plate', 'cup', 'lantern', 'canister']

export class CreatureTinsmithsSystem {
  private tinsmiths: Tinsmith[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.tinsmiths.length >= MAX_TINSMITHS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 11) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 7)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const prodIdx = Math.min(3, Math.floor(skill / 25))
      const itemsMade = 1 + Math.floor(skill / 7)

      this.tinsmiths.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        itemsMade,
        product: PRODUCTS[prodIdx],
        finishQuality: 20 + skill * 0.7,
        reputation: 12 + skill * 0.8,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.tinsmiths.length - 1; i >= 0; i--) {
      if (this.tinsmiths[i].tick < cutoff) this.tinsmiths.splice(i, 1)
    }
  }

}
