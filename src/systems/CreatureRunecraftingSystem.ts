// Creature Runecrafting System (v3.86) - Creatures learn to inscribe magical runes
// Runes enhance equipment and buildings with elemental power

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type RuneType = 'fire' | 'ice' | 'lightning' | 'earth' | 'wind' | 'shadow' | 'light'

export interface Rune {
  id: number
  type: RuneType
  power: number
  creator: number
  tick: number
}

const CHECK_INTERVAL = 1500
const LEARN_CHANCE = 0.003
const MAX_RUNES = 200
const SKILL_GROWTH = 0.06

const RUNE_TYPES: RuneType[] = ['fire', 'ice', 'lightning', 'earth', 'wind', 'shadow', 'light']

export class CreatureRunecraftingSystem {
  private runes: Rune[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.runes.length >= MAX_RUNES) break
      if (Math.random() > LEARN_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 15) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const type = RUNE_TYPES[Math.floor(Math.random() * RUNE_TYPES.length)]
      const power = skill * (0.3 + Math.random() * 0.7)

      this.runes.push({
        id: this.nextId++,
        type, power,
        creator: eid,
        tick,
      })
    }

    const cutoff = tick - 50000
    for (let i = this.runes.length - 1; i >= 0; i--) {
      if (this.runes[i].tick < cutoff) this.runes.splice(i, 1)
    }
  }

}
