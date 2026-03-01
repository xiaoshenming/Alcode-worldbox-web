// Creature Fermentation System (v3.56) - Creatures discover and develop fermentation
// Fermented goods boost morale, enable trade, and can cause intoxication effects

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type FermentType = 'fruit_wine' | 'grain_beer' | 'honey_mead' | 'herb_tonic' | 'root_brew' | 'mushroom_elixir'

export interface FermentedGood {
  id: number
  producerId: number
  type: FermentType
  quality: number      // 0-100
  potency: number      // intoxication strength
  moraleBoost: number
  tradeValue: number
  ageTicks: number
  tick: number
}

const CHECK_INTERVAL = 1200
const FERMENT_CHANCE = 0.005
const MAX_GOODS = 100
const QUALITY_GROWTH = 0.06
const AGE_BONUS = 0.02

const TYPES: FermentType[] = ['fruit_wine', 'grain_beer', 'honey_mead', 'herb_tonic', 'root_brew', 'mushroom_elixir']

export class CreatureFermentationSystem {
  private goods: FermentedGood[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    // Produce fermented goods
    for (const eid of creatures) {
      if (this.goods.length >= MAX_GOODS) break
      if (Math.random() > FERMENT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 16) continue

      let skill = this.skillMap.get(eid) ?? (5 + Math.random() * 15)
      skill = Math.min(100, skill + QUALITY_GROWTH)
      this.skillMap.set(eid, skill)

      const type = TYPES[Math.floor(Math.random() * TYPES.length)]
      const quality = skill * (0.6 + Math.random() * 0.4)

      this.goods.push({
        id: this.nextId++,
        producerId: eid,
        type,
        quality,
        potency: 20 + Math.random() * quality * 0.6,
        moraleBoost: quality * 0.3,
        tradeValue: quality * 0.5,
        ageTicks: 0,
        tick,
      })
    }

    // Age goods and improve quality
    for (let i = this.goods.length - 1; i >= 0; i--) {
      const g = this.goods[i]
      g.ageTicks += CHECK_INTERVAL
      g.quality = Math.min(100, g.quality + AGE_BONUS)
      g.tradeValue = g.quality * 0.5 + g.ageTicks * 0.001

      // Very old goods spoil
      if (g.ageTicks > 50000) {
        this.goods.splice(i, 1)
      }
    }
  }

}
