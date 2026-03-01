// Creature Parchment Makers System (v3.314) - Parchment production craftsmen
// Artisans who prepare animal skins into writing surfaces for scrolls and books

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type ParchmentGrade = 'rough' | 'standard' | 'fine' | 'vellum'

export interface ParchmentMaker {
  id: number
  entityId: number
  skill: number
  sheetsMade: number
  grade: ParchmentGrade
  scraping: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1500
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.06

const GRADES: ParchmentGrade[] = ['rough', 'standard', 'fine', 'vellum']

export class CreatureParchmentMakersSystem {
  private makers: ParchmentMaker[] = []
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

      const gradeIdx = Math.min(3, Math.floor(skill / 25))
      const sheetsMade = 1 + Math.floor(skill / 7)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        sheetsMade,
        grade: GRADES[gradeIdx],
        scraping: 15 + skill * 0.65,
        reputation: 10 + skill * 0.75,
        tick,
      })
    }

    const cutoff = tick - 52000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

}
