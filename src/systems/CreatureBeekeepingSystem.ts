// Creature Beekeeping System (v3.71) - Creatures learn to keep bees
// Honey provides food, medicine, and trade goods; beeswax for candles and sealing

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type HiveProduct = 'honey' | 'beeswax' | 'royal_jelly' | 'propolis' | 'mead' | 'honeycomb'

export interface Apiary {
  id: number
  keeperId: number
  hiveCount: number
  product: HiveProduct
  yield: number
  quality: number
  tick: number
}

const CHECK_INTERVAL = 1100
const KEEP_CHANCE = 0.005
const MAX_APIARIES = 80
const SKILL_GROWTH = 0.08

const PRODUCTS: HiveProduct[] = ['honey', 'beeswax', 'royal_jelly', 'propolis', 'mead', 'honeycomb']

export class CreatureBeekeepingSystem {
  private apiaries: Apiary[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.apiaries.length >= MAX_APIARIES) break
      if (Math.random() > KEEP_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (5 + Math.random() * 15)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)]
      const hiveCount = 1 + Math.floor(skill / 25)
      const quality = skill * (0.5 + Math.random() * 0.5)

      this.apiaries.push({
        id: this.nextId++,
        keeperId: eid,
        hiveCount,
        product,
        yield: hiveCount * quality * 0.3,
        quality,
        tick,
      })
    }

    const cutoff = tick - 50000
    for (let i = this.apiaries.length - 1; i >= 0; i--) {
      if (this.apiaries[i].tick < cutoff) {
        this.apiaries.splice(i, 1)
      }
    }
  }

  getApiaries(): readonly Apiary[] { return this.apiaries }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
