// Creature Alchemy System (v3.94) - Creatures brew potions with various effects
// Alchemists craft healing draughts, strength elixirs, and dangerous poisons

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type PotionType = 'healing' | 'strength' | 'speed' | 'invisibility' | 'fire_resistance' | 'poison'

export interface Potion {
  id: number
  type: PotionType
  potency: number
  creator: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 1800
const BREW_CHANCE = 0.003
const MAX_POTIONS = 150
const SKILL_GROWTH = 0.06

const POTION_TYPES: PotionType[] = ['healing', 'strength', 'speed', 'invisibility', 'fire_resistance', 'poison']

const POTENCY_BASE: Record<PotionType, number> = {
  healing: 30, strength: 25, speed: 20, invisibility: 15, fire_resistance: 20, poison: 35,
}

export class CreatureAlchemySystem {
  private potions: Potion[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.potions.length >= MAX_POTIONS) break
      if (Math.random() > BREW_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (4 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const type = POTION_TYPES[Math.floor(Math.random() * POTION_TYPES.length)]
      const potency = POTENCY_BASE[type] * (0.4 + skill / 100)

      this.potions.push({
        id: this.nextId++,
        type,
        potency,
        creator: eid,
        duration: 2000 + Math.floor(skill * 40),
        tick,
      })
    }

    // Expire old potions
    const cutoff = tick - 50000
    for (let i = this.potions.length - 1; i >= 0; i--) {
      if (this.potions[i].tick < cutoff) this.potions.splice(i, 1)
    }
  }

}
