// Creature Chandlers System (v3.243) - Chandlers make candles and soap
// Craftspeople who produce essential lighting and hygiene products from tallow and wax

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type ChandlerProduct = 'tallow_candle' | 'beeswax_candle' | 'soap' | 'perfumed_candle'

export interface Chandler {
  id: number
  entityId: number
  skill: number
  itemsMade: number
  product: ChandlerProduct
  quality: number
  burnTime: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.006
const MAX_CHANDLERS = 34
const SKILL_GROWTH = 0.07

const PRODUCTS: ChandlerProduct[] = ['tallow_candle', 'beeswax_candle', 'soap', 'perfumed_candle']

export class CreatureChandlersSystem {
  private chandlers: Chandler[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.chandlers.length >= MAX_CHANDLERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 8) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const prodIdx = Math.min(3, Math.floor(skill / 25))
      const itemsMade = 2 + Math.floor(skill / 10)

      this.chandlers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        itemsMade,
        product: PRODUCTS[prodIdx],
        quality: 20 + skill * 0.7,
        burnTime: 5 + skill * 0.5,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.chandlers.length - 1; i >= 0; i--) {
      if (this.chandlers[i].tick < cutoff) this.chandlers.splice(i, 1)
    }
  }

  getChandlers(): Chandler[] { return this.chandlers }
}
