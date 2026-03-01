// Creature Charcoal Burners System (v3.301) - Charcoal production workers
// Workers who slowly burn wood in kilns to produce charcoal for smithing and heating

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type CharcoalGrade = 'soft' | 'medium' | 'hard' | 'activated'

export interface CharcoalBurner {
  id: number
  entityId: number
  skill: number
  batchesProduced: number
  grade: CharcoalGrade
  burnEfficiency: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1450
const CRAFT_CHANCE = 0.005
const MAX_BURNERS = 32
const SKILL_GROWTH = 0.065

const GRADES: CharcoalGrade[] = ['soft', 'medium', 'hard', 'activated']

export class CreatureCharcoalBurnersSystem {
  private burners: CharcoalBurner[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.burners.length >= MAX_BURNERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 11) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 7)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const gradeIdx = Math.min(3, Math.floor(skill / 25))
      const batchesProduced = 1 + Math.floor(skill / 10)

      this.burners.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        batchesProduced,
        grade: GRADES[gradeIdx],
        burnEfficiency: 20 + skill * 0.7,
        reputation: 10 + skill * 0.75,
        tick,
      })
    }

    const cutoff = tick - 54000
    for (let i = this.burners.length - 1; i >= 0; i--) {
      if (this.burners[i].tick < cutoff) this.burners.splice(i, 1)
    }
  }

}
