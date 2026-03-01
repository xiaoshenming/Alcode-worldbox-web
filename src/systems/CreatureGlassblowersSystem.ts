// Creature Glassblowers System (v3.311) - Glass blowing craftsmen
// Artisans who shape molten glass into vessels, windows, and decorative items

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type GlassType = 'clear' | 'colored' | 'stained' | 'crystal'

export interface Glassblower {
  id: number
  entityId: number
  skill: number
  piecesMade: number
  glassType: GlassType
  lungCapacity: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1450
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.062

const GLASS_TYPES: GlassType[] = ['clear', 'colored', 'stained', 'crystal']

export class CreatureGlassblowersSystem {
  private makers: Glassblower[] = []
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
      const piecesMade = 1 + Math.floor(skill / 9)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        piecesMade,
        glassType: GLASS_TYPES[typeIdx],
        lungCapacity: 20 + skill * 0.6,
        reputation: 10 + skill * 0.8,
        tick,
      })
    }

    const cutoff = tick - 54000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

}
