// Creature Sawyer System (v3.233) - Sawyers cut timber into lumber
// Woodworkers who operate saws to produce planks and beams for construction

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type WoodGrade = 'rough' | 'standard' | 'select' | 'premium'

export interface Sawyer {
  id: number
  entityId: number
  skill: number
  logsCut: number
  woodGrade: WoodGrade
  boardFeet: number
  precision: number
  tick: number
}

const CHECK_INTERVAL = 1300
const CRAFT_CHANCE = 0.006
const MAX_SAWYERS = 40
const SKILL_GROWTH = 0.08

const GRADES: WoodGrade[] = ['rough', 'standard', 'select', 'premium']

export class CreatureSawyerSystem {
  private sawyers: Sawyer[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.sawyers.length >= MAX_SAWYERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 9)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const gradeIdx = Math.min(3, Math.floor(skill / 25))
      const logsCut = 2 + Math.floor(skill / 10)
      const boardFeet = 50 + skill * 3 + Math.random() * 100

      this.sawyers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        logsCut,
        woodGrade: GRADES[gradeIdx],
        boardFeet: Math.min(500, boardFeet),
        precision: 10 + skill * 0.8 + Math.random() * 8,
        tick,
      })
    }

    const cutoff = tick - 44000
    for (let i = this.sawyers.length - 1; i >= 0; i--) {
      if (this.sawyers[i].tick < cutoff) {
        this.sawyers.splice(i, 1)
      }
    }
  }

  getSawyers(): readonly Sawyer[] { return this.sawyers }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
