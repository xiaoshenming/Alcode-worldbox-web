// Creature Perfumers System (v3.256) - Perfumers distill fragrances from flowers and herbs
// Artisans who blend essential oils and aromatics into perfumes and incense

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type FragranceType = 'floral' | 'herbal' | 'spiced' | 'resinous'

export interface Perfumer {
  id: number
  entityId: number
  skill: number
  blendsCreated: number
  fragranceType: FragranceType
  potency: number
  complexity: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.006
const MAX_PERFUMERS = 34
const SKILL_GROWTH = 0.07

const FRAGRANCE_TYPES: FragranceType[] = ['floral', 'herbal', 'spiced', 'resinous']

export class CreaturePerfumersSystem {
  private perfumers: Perfumer[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.perfumers.length >= MAX_PERFUMERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const blendsCreated = 1 + Math.floor(skill / 12)

      this.perfumers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        blendsCreated,
        fragranceType: FRAGRANCE_TYPES[typeIdx],
        potency: 20 + skill * 0.7,
        complexity: 15 + skill * 0.75,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.perfumers.length - 1; i >= 0; i--) {
      if (this.perfumers[i].tick < cutoff) this.perfumers.splice(i, 1)
    }
  }

}
