// Creature Dyeing Makers System (v3.443) - Dyeing artisans
// Skilled workers who color textiles using natural and synthetic dyes

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type DyeingType = 'vat_dyeing' | 'resist_dyeing' | 'mordant_dyeing' | 'direct_dyeing'

export interface DyeingMaker {
  id: number
  entityId: number
  skill: number
  batchesDyed: number
  dyeingType: DyeingType
  colorFastness: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1460
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.050

const DYEING_TYPES: DyeingType[] = ['vat_dyeing', 'resist_dyeing', 'mordant_dyeing', 'direct_dyeing']

export class CreatureDyeingMakersSystem {
  private makers: DyeingMaker[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.makers.length >= MAX_MAKERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 7)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const batchesDyed = 4 + Math.floor(skill / 6)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        batchesDyed,
        dyeingType: DYEING_TYPES[typeIdx],
        colorFastness: 12 + skill * 0.75,
        reputation: 10 + skill * 0.77,
        tick,
      })
    }

    const cutoff = tick - 48000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): DyeingMaker[] { return this.makers }
}
