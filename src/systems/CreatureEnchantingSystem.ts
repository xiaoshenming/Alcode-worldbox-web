// Creature Enchanting System (v3.96) - Creatures enchant items with magical effects
// Enchantments boost equipment stats like sharpness, protection, and swiftness

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type EnchantType = 'sharpness' | 'protection' | 'swiftness' | 'vitality' | 'flame' | 'frost'

export interface Enchantment {
  id: number
  type: EnchantType
  power: number
  target: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 1500
const ENCHANT_CHANCE = 0.003
const MAX_ENCHANTMENTS = 120
const POWER_DECAY = 0.02

const ENCHANT_TYPES: EnchantType[] = ['sharpness', 'protection', 'swiftness', 'vitality', 'flame', 'frost']

export class CreatureEnchantingSystem {
  private enchantments: Enchantment[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.enchantments.length >= MAX_ENCHANTMENTS) break
      if (Math.random() > ENCHANT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 12) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 6)
      skill = Math.min(100, skill + 0.05)
      this.skillMap.set(eid, skill)

      const type = ENCHANT_TYPES[Math.floor(Math.random() * ENCHANT_TYPES.length)]
      const power = skill * (0.4 + Math.random() * 0.6)

      this.enchantments.push({
        id: this.nextId++,
        type, power,
        target: eid,
        duration: 3000 + Math.floor(Math.random() * 7000),
        tick,
      })
    }

    // Decay and prune
    for (let i = this.enchantments.length - 1; i >= 0; i--) {
      const e = this.enchantments[i]
      e.power = Math.max(0, e.power - POWER_DECAY)
      if (e.power <= 0 || tick - e.tick > e.duration) {
        this.enchantments.splice(i, 1)
      }
    }
  }

}
