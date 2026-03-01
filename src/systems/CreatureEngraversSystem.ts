// Creature Engravers System (v3.251) - Engravers carve intricate designs into metal and stone
// Artisans who etch decorative patterns, inscriptions, and imagery onto surfaces

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type EngravingMedium = 'metal' | 'stone' | 'wood' | 'gem'

export interface Engraver {
  id: number
  entityId: number
  skill: number
  piecesCompleted: number
  medium: EngravingMedium
  precision: number
  creativity: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.006
const MAX_ENGRAVERS = 34
const SKILL_GROWTH = 0.07

const MEDIUMS: EngravingMedium[] = ['metal', 'stone', 'wood', 'gem']

export class CreatureEngraversSystem {
  private engravers: Engraver[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.engravers.length >= MAX_ENGRAVERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const medIdx = Math.min(3, Math.floor(skill / 25))
      const piecesCompleted = 1 + Math.floor(skill / 10)

      this.engravers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        piecesCompleted,
        medium: MEDIUMS[medIdx],
        precision: 25 + skill * 0.65,
        creativity: 20 + skill * 0.7,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.engravers.length - 1; i >= 0; i--) {
      if (this.engravers[i].tick < cutoff) this.engravers.splice(i, 1)
    }
  }

}
