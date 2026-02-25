// Creature Tanner System (v3.201) - Tanners process animal hides into leather
// Leather is essential for armor, clothing, and trade goods

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type LeatherGrade = 'rawhide' | 'tanned' | 'cured' | 'tooled'

export interface Tanner {
  id: number
  entityId: number
  skill: number
  hidesProcessed: number
  leatherGrade: LeatherGrade
  quality: number
  tradeValue: number
  tick: number
}

const CHECK_INTERVAL = 1200
const CRAFT_CHANCE = 0.006
const MAX_TANNERS = 50
const SKILL_GROWTH = 0.08

const GRADES: LeatherGrade[] = ['rawhide', 'tanned', 'cured', 'tooled']

export class CreatureTannerSystem {
  private tanners: Tanner[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.tanners.length >= MAX_TANNERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 10)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const gradeIdx = Math.min(3, Math.floor(skill / 25))
      const leatherGrade = GRADES[gradeIdx]
      const hidesProcessed = 2 + Math.floor(skill / 10)
      const quality = 15 + skill * 0.75 + Math.random() * 10

      this.tanners.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        hidesProcessed,
        leatherGrade,
        quality: Math.min(100, quality),
        tradeValue: quality * 0.8 * (gradeIdx + 1),
        tick,
      })
    }

    const cutoff = tick - 44000
    for (let i = this.tanners.length - 1; i >= 0; i--) {
      if (this.tanners[i].tick < cutoff) {
        this.tanners.splice(i, 1)
      }
    }
  }

  getTanners(): readonly Tanner[] { return this.tanners }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
