// Creature Soap Makers System (v3.308) - Soap production craftsmen
// Artisans who combine fats and lye to produce soaps for hygiene and trade

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type SoapType = 'tallow' | 'olive' | 'herbal' | 'perfumed'

export interface SoapMaker {
  id: number
  entityId: number
  skill: number
  batchesMade: number
  soapType: SoapType
  purity: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.065

const SOAP_TYPES: SoapType[] = ['tallow', 'olive', 'herbal', 'perfumed']

export class CreatureSoapMakersSystem {
  private makers: SoapMaker[] = []
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
      const batchesMade = 1 + Math.floor(skill / 8)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        batchesMade,
        soapType: SOAP_TYPES[typeIdx],
        purity: 15 + skill * 0.7,
        reputation: 10 + skill * 0.8,
        tick,
      })
    }

    const cutoff = tick - 53000
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): SoapMaker[] { return this.makers }
}
