// Creature Calderers System (v3.347) - Cauldron making craftsmen
// Artisans who forge and shape large metal cooking vessels

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type CauldronMetal = 'iron' | 'copper' | 'bronze' | 'brass'

export interface Calderer {
  id: number
  entityId: number
  skill: number
  cauldronsMade: number
  metalType: CauldronMetal
  heatRetention: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1430
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.060

const METALS: CauldronMetal[] = ['iron', 'copper', 'bronze', 'brass']

export class CreatureCalderersSystem {
  private makers: Calderer[] = []
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

      const metalIdx = Math.min(3, Math.floor(skill / 25))
      const cauldronsMade = 1 + Math.floor(skill / 8)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        cauldronsMade,
        metalType: METALS[metalIdx],
        heatRetention: 18 + skill * 0.68,
        reputation: 10 + skill * 0.77,
        tick,
      })
    }

    const cutoff = tick - 53500
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

  getMakers(): Calderer[] { return this.makers }
}
