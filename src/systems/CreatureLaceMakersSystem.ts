// Creature Lace Makers System (v3.329) - Lace weaving craftsmen
// Artisans who create intricate lace patterns from fine threads

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type LaceStyle = 'bobbin' | 'needle' | 'tatting' | 'crochet'

export interface LaceMaker {
  id: number
  entityId: number
  skill: number
  piecesWoven: number
  laceStyle: LaceStyle
  threadFineness: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1380
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.059

const LACE_STYLES: LaceStyle[] = ['bobbin', 'needle', 'tatting', 'crochet']

export class CreatureLaceMakersSystem {
  private makers: LaceMaker[] = []
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
      const piecesWoven = 1 + Math.floor(skill / 10)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        piecesWoven,
        laceStyle: LACE_STYLES[styleIdx],
        threadFineness: 12 + skill * 0.72,
        reputation: 10 + skill * 0.82,
        tick,
      })
    }

    const cutoff = tick - 52000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

}
