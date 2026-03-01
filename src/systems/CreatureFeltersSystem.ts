// Creature Felters System (v3.288) - Felt making craftsmen
// Artisans who compress and mat wool fibers into felt for clothing and shelters

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type FeltProduct = 'hat' | 'blanket' | 'tent' | 'boot'

export interface Felter {
  id: number
  entityId: number
  skill: number
  feltProduced: number
  product: FeltProduct
  thickness: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.005
const MAX_FELTERS = 30
const SKILL_GROWTH = 0.065

const PRODUCTS: FeltProduct[] = ['hat', 'blanket', 'tent', 'boot']

export class CreatureFeltersSystem {
  private felters: Felter[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.felters.length >= MAX_FELTERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 7)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const prodIdx = Math.min(3, Math.floor(skill / 25))
      const feltProduced = 1 + Math.floor(skill / 9)

      this.felters.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        feltProduced,
        product: PRODUCTS[prodIdx],
        thickness: 15 + skill * 0.65,
        reputation: 10 + skill * 0.8,
        tick,
      })
    }

    const cutoff = tick - 53000
    for (let i = this.felters.length - 1; i >= 0; i--) {
      if (this.felters[i].tick < cutoff) this.felters.splice(i, 1)
    }
  }

}
