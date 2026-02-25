// Creature Rugmaker System (v3.221) - Rugmakers weave decorative rugs and carpets
// Skilled weavers who create floor coverings from wool, silk, and plant fibers

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type RugPattern = 'geometric' | 'floral' | 'medallion' | 'tribal'

export interface Rugmaker {
  id: number
  entityId: number
  skill: number
  rugsMade: number
  pattern: RugPattern
  knotDensity: number
  colorCount: number
  tick: number
}

const CHECK_INTERVAL = 1350
const CRAFT_CHANCE = 0.006
const MAX_RUGMAKERS = 38
const SKILL_GROWTH = 0.07

const PATTERNS: RugPattern[] = ['geometric', 'floral', 'medallion', 'tribal']

export class CreatureRugmakerSystem {
  private rugmakers: Rugmaker[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.rugmakers.length >= MAX_RUGMAKERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const patIdx = Math.min(3, Math.floor(skill / 25))
      const rugsMade = 1 + Math.floor(skill / 18)
      const knotDensity = 30 + skill * 1.5 + Math.random() * 40

      this.rugmakers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        rugsMade,
        pattern: PATTERNS[patIdx],
        knotDensity: Math.min(250, knotDensity),
        colorCount: 3 + Math.floor(skill / 15),
        tick,
      })
    }

    const cutoff = tick - 46000
    for (let i = this.rugmakers.length - 1; i >= 0; i--) {
      if (this.rugmakers[i].tick < cutoff) {
        this.rugmakers.splice(i, 1)
      }
    }
  }

  getRugmakers(): readonly Rugmaker[] { return this.rugmakers }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
