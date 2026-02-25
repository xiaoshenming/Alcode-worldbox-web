// Creature Embroidery Makers System (v3.422) - Embroidery artisans
// Skilled workers who create decorative needlework on fabric

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type EmbroideryType = 'cross_stitch' | 'crewel' | 'goldwork' | 'whitework'

export interface EmbroideryMaker {
  id: number
  entityId: number
  skill: number
  piecesMade: number
  embroideryType: EmbroideryType
  stitchPrecision: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1520
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.053

const EMBROIDERY_TYPES: EmbroideryType[] = ['cross_stitch', 'crewel', 'goldwork', 'whitework']

export class CreatureEmbroideryMakersSystem {
  private makers: EmbroideryMaker[] = []
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
      const piecesMade = 2 + Math.floor(skill / 8)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        piecesMade,
        embroideryType: EMBROIDERY_TYPES[typeIdx],
        stitchPrecision: 14 + skill * 0.73,
        reputation: 10 + skill * 0.80,
        tick,
      })
    }

    const cutoff = tick - 52000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): EmbroideryMaker[] { return this.makers }
}
