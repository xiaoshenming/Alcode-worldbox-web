// Creature Illuminators System (v3.353) - Manuscript illumination craftsmen
// Artisans who decorate manuscripts with gold leaf, vivid colors, and intricate borders

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type IlluminationStyle = 'historiated' | 'decorated' | 'inhabited' | 'border'

export interface Illuminator {
  id: number
  entityId: number
  skill: number
  pagesIlluminated: number
  style: IlluminationStyle
  goldLeafUse: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1350
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.056

const STYLES: IlluminationStyle[] = ['historiated', 'decorated', 'inhabited', 'border']

export class CreatureIlluminatorsSystem {
  private makers: Illuminator[] = []
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
      const pagesIlluminated = 1 + Math.floor(skill / 10)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        pagesIlluminated,
        style: STYLES[styleIdx],
        goldLeafUse: 10 + skill * 0.74,
        reputation: 10 + skill * 0.86,
        tick,
      })
    }

    const cutoff = tick - 50500
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): Illuminator[] { return this.makers }
}
