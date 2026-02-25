// Creature Limeburners System (v3.291) - Lime kiln operators
// Workers who burn limestone to produce quicklime for mortar and plaster

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type LimeProduct = 'quicklime' | 'slaked_lime' | 'mortar' | 'plaster'

export interface Limeburner {
  id: number
  entityId: number
  skill: number
  batchesBurned: number
  product: LimeProduct
  purity: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1450
const CRAFT_CHANCE = 0.005
const MAX_BURNERS = 30
const SKILL_GROWTH = 0.065

const PRODUCTS: LimeProduct[] = ['quicklime', 'slaked_lime', 'mortar', 'plaster']

export class CreatureLimeburnersSystem {
  private burners: Limeburner[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.burners.length >= MAX_BURNERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 11) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 7)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const prodIdx = Math.min(3, Math.floor(skill / 25))
      const batchesBurned = 1 + Math.floor(skill / 10)

      this.burners.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        batchesBurned,
        product: PRODUCTS[prodIdx],
        purity: 20 + skill * 0.7,
        reputation: 10 + skill * 0.75,
        tick,
      })
    }

    const cutoff = tick - 54000
    for (let i = this.burners.length - 1; i >= 0; i--) {
      if (this.burners[i].tick < cutoff) this.burners.splice(i, 1)
    }
  }

  getBurners(): Limeburner[] { return this.burners }
}
