// Creature Handicraft System (v3.46) - Creatures craft decorative items and tools
// Crafted items boost prestige and can be traded between civilizations

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type CraftType = 'jewelry' | 'pottery' | 'weapon' | 'textile' | 'sculpture' | 'instrument'

export interface Handicraft {
  id: number
  crafterId: number
  type: CraftType
  quality: number     // 0-100
  prestige: number    // bonus to crafter's status
  traded: boolean
  tick: number
}

const CHECK_INTERVAL = 1100
const CRAFT_CHANCE = 0.006
const MAX_CRAFTS = 100
const QUALITY_VARIANCE = 30

const TYPES: CraftType[] = ['jewelry', 'pottery', 'weapon', 'textile', 'sculpture', 'instrument']

const PRESTIGE_MAP: Record<CraftType, number> = {
  jewelry: 15,
  pottery: 5,
  weapon: 12,
  textile: 4,
  sculpture: 10,
  instrument: 8,
}

export class CreatureHandicraftSystem {
  private crafts: Handicraft[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    // Creatures attempt crafting
    for (const eid of creatures) {
      if (this.crafts.length >= MAX_CRAFTS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const type = TYPES[Math.floor(Math.random() * TYPES.length)]
      const quality = 30 + Math.random() * QUALITY_VARIANCE + Math.random() * 40
      this.crafts.push({
        id: this.nextId++,
        crafterId: eid,
        type,
        quality: Math.min(100, quality),
        prestige: PRESTIGE_MAP[type] * (quality / 50),
        traded: false,
        tick,
      })
    }

    // Trade some crafts
    for (const craft of this.crafts) {
      if (craft.traded) continue
      if (Math.random() < 0.003) {
        craft.traded = true
        craft.prestige *= 1.5
      }
    }

    // Remove old crafts
    const cutoff = tick - 8000
    this.crafts = this.crafts.filter(c => c.tick > cutoff)
  }

  getCrafts(): Handicraft[] {
    return this.crafts
  }

  getByCrafter(entityId: number): Handicraft[] {
    return this.crafts.filter(c => c.crafterId === entityId)
  }
}
