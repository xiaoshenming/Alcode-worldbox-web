// Creature Reed Cutters System (v3.276) - Harvesters of reeds and rushes
// Workers who gather reeds for thatching, basket weaving, and mat making

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type ReedProduct = 'thatch' | 'basket' | 'mat' | 'rope'

export interface ReedCutter {
  id: number
  entityId: number
  skill: number
  bundlesHarvested: number
  product: ReedProduct
  efficiency: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.006
const MAX_CUTTERS = 32
const SKILL_GROWTH = 0.065

const PRODUCTS: ReedProduct[] = ['thatch', 'basket', 'mat', 'rope']

export class CreatureReedCuttersSystem {
  private cutters: ReedCutter[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.cutters.length >= MAX_CUTTERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 8) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 6)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const prodIdx = Math.min(3, Math.floor(skill / 25))
      const bundlesHarvested = 2 + Math.floor(skill / 6)

      this.cutters.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        bundlesHarvested,
        product: PRODUCTS[prodIdx],
        efficiency: 20 + skill * 0.7,
        reputation: 8 + skill * 0.75,
        tick,
      })
    }

    const cutoff = tick - 50000
    for (let i = this.cutters.length - 1; i >= 0; i--) {
      if (this.cutters[i].tick < cutoff) this.cutters.splice(i, 1)
    }
  }

  getCutters(): ReedCutter[] { return this.cutters }
}
