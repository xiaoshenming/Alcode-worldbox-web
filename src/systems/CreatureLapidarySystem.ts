// Creature Lapidary System (v3.216) - Lapidaries cut and polish gemstones
// Skilled artisans transform rough stones into dazzling jewels prized by nobles and traders

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type GemCut = 'brilliant' | 'cabochon' | 'emerald' | 'marquise'

export interface Lapidary {
  id: number
  entityId: number
  skill: number
  gemsCut: number
  gemCut: GemCut
  clarity: number
  caratWeight: number
  tick: number
}

const CHECK_INTERVAL = 1300
const CRAFT_CHANCE = 0.006
const MAX_LAPIDARIES = 42
const SKILL_GROWTH = 0.08

const CUTS: GemCut[] = ['brilliant', 'cabochon', 'emerald', 'marquise']

export class CreatureLapidarySystem {
  private lapidaries: Lapidary[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.lapidaries.length >= MAX_LAPIDARIES) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 10)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const cutIdx = Math.min(3, Math.floor(skill / 25))
      const gemCut = CUTS[cutIdx]
      const gemsCut = 1 + Math.floor(skill / 15)
      const clarity = 10 + skill * 0.8 + Math.random() * 10

      this.lapidaries.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        gemsCut,
        gemCut,
        clarity: Math.min(100, clarity),
        caratWeight: 0.5 + skill * 0.04 + Math.random() * 2,
        tick,
      })
    }

    const cutoff = tick - 46000
    for (let i = this.lapidaries.length - 1; i >= 0; i--) {
      if (this.lapidaries[i].tick < cutoff) {
        this.lapidaries.splice(i, 1)
      }
    }
  }

  getLapidaries(): readonly Lapidary[] { return this.lapidaries }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
