// Creature Enamelers System (v3.341) - Enamel coating craftsmen
// Artisans who apply vitreous enamel to metal, glass, and ceramics

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type EnamelTechnique = 'cloisonne' | 'champleve' | 'plique' | 'grisaille'

export interface Enameler {
  id: number
  entityId: number
  skill: number
  piecesEnameled: number
  technique: EnamelTechnique
  colorRange: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1410
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.059

const TECHNIQUES: EnamelTechnique[] = ['cloisonne', 'champleve', 'plique', 'grisaille']

export class CreatureEnamelersSystem {
  private makers: Enameler[] = []
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

      const techIdx = Math.min(3, Math.floor(skill / 25))
      const piecesEnameled = 1 + Math.floor(skill / 9)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        piecesEnameled,
        technique: TECHNIQUES[techIdx],
        colorRange: 15 + skill * 0.72,
        reputation: 10 + skill * 0.81,
        tick,
      })
    }

    const cutoff = tick - 52500
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): Enameler[] { return this.makers }
}
