// Creature Scriveners System (v3.350) - Professional scribes
// Artisans who copy manuscripts, draft legal documents, and record history

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type ScriptStyle = 'uncial' | 'gothic' | 'italic' | 'copperplate'

export interface Scrivener {
  id: number
  entityId: number
  skill: number
  documentsWritten: number
  scriptStyle: ScriptStyle
  penmanship: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1370
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.057

const STYLES: ScriptStyle[] = ['uncial', 'gothic', 'italic', 'copperplate']

export class CreatureScrivenersSystem {
  private makers: Scrivener[] = []
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

      const styleIdx = Math.min(3, Math.floor(skill / 25))
      const documentsWritten = 1 + Math.floor(skill / 7)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        documentsWritten,
        scriptStyle: STYLES[styleIdx],
        penmanship: 15 + skill * 0.75,
        reputation: 10 + skill * 0.84,
        tick,
      })
    }

    const cutoff = tick - 51000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

}
