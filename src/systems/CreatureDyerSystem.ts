// Creature Dyer System (v3.213) - Dyers create pigments and dye textiles
// Hands stained deep with color, the dyer transforms plain cloth into vibrant tapestries of indigo and crimson

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type DyeColor = 'indigo' | 'crimson' | 'saffron' | 'tyrian'

export interface Dyer {
  id: number
  entityId: number
  skill: number
  batchesDyed: number
  dyeColor: DyeColor
  colorFastness: number
  rarity: number
  tick: number
}

const CHECK_INTERVAL = 1100
const CRAFT_CHANCE = 0.006
const MAX_DYERS = 52
const SKILL_GROWTH = 0.08

const DYE_COLORS: DyeColor[] = ['indigo', 'crimson', 'saffron', 'tyrian']
const DYE_RARITY: Record<DyeColor, number> = { indigo: 0.3, crimson: 0.5, saffron: 0.7, tyrian: 0.95 }

export class CreatureDyerSystem {
  private dyers: Dyer[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.dyers.length >= MAX_DYERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 10)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const dyeColor = DYE_COLORS[Math.floor(Math.random() * DYE_COLORS.length)]
      const colorFastness = 20 + skill * 0.7 + Math.random() * 10

      this.dyers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        batchesDyed: 1 + Math.floor(skill / 15),
        dyeColor,
        colorFastness: Math.min(100, colorFastness),
        rarity: DYE_RARITY[dyeColor],
        tick
      })
    }

    const cutoff = tick - 42000
    for (let i = this.dyers.length - 1; i >= 0; i--) {
      if (this.dyers[i].tick < cutoff) this.dyers.splice(i, 1)
    }
  }

  getDyers(): readonly Dyer[] { return this.dyers }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
