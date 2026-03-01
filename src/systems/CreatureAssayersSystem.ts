// Creature Assayers System (v3.261) - Assayers test and evaluate ore purity
// Specialists who analyze mineral samples to determine metal content and value

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type OreType = 'gold' | 'silver' | 'copper' | 'iron'

export interface Assayer {
  id: number
  entityId: number
  skill: number
  samplesAnalyzed: number
  oreType: OreType
  accuracy: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.006
const MAX_ASSAYERS = 34
const SKILL_GROWTH = 0.07

const ORE_TYPES: OreType[] = ['gold', 'silver', 'copper', 'iron']

export class CreatureAssayersSystem {
  private assayers: Assayer[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.assayers.length >= MAX_ASSAYERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 11) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const samplesAnalyzed = 1 + Math.floor(skill / 9)

      this.assayers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        samplesAnalyzed,
        oreType: ORE_TYPES[typeIdx],
        accuracy: 30 + skill * 0.6,
        reputation: 15 + skill * 0.75,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.assayers.length - 1; i >= 0; i--) {
      if (this.assayers[i].tick < cutoff) this.assayers.splice(i, 1)
    }
  }

}
