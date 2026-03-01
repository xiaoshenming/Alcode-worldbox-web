// Creature Horners System (v3.271) - Horn and antler craftsmen
// Artisans who carve horn and antler into combs, buttons, and decorative items

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type HornProduct = 'comb' | 'button' | 'cup' | 'ornament'

export interface Horner {
  id: number
  entityId: number
  skill: number
  itemsCrafted: number
  product: HornProduct
  quality: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1450
const CRAFT_CHANCE = 0.005
const MAX_HORNERS = 30
const SKILL_GROWTH = 0.065

const PRODUCTS: HornProduct[] = ['comb', 'button', 'cup', 'ornament']

export class CreatureHornersSystem {
  private horners: Horner[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.horners.length >= MAX_HORNERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 7)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const prodIdx = Math.min(3, Math.floor(skill / 25))
      const itemsCrafted = 1 + Math.floor(skill / 7)

      this.horners.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        itemsCrafted,
        product: PRODUCTS[prodIdx],
        quality: 20 + skill * 0.65,
        reputation: 10 + skill * 0.8,
        tick,
      })
    }

    const cutoff = tick - 53000
    for (let i = this.horners.length - 1; i >= 0; i--) {
      if (this.horners[i].tick < cutoff) this.horners.splice(i, 1)
    }
  }

}
