// Creature Comb Makers System (v3.359) - Comb crafting artisans
// Artisans who carve combs from bone, horn, wood, and ivory

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type CombMaterial = 'bone' | 'horn' | 'wood' | 'ivory'

export interface CombMaker {
  id: number
  entityId: number
  skill: number
  combsMade: number
  material: CombMaterial
  teethFineness: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.005
const MAX_MAKERS = 30
const SKILL_GROWTH = 0.057

const MATERIALS: CombMaterial[] = ['bone', 'horn', 'wood', 'ivory']

export class CreatureCombMakersSystem {
  private makers: CombMaker[] = []
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

      const matIdx = Math.min(3, Math.floor(skill / 25))
      const combsMade = 1 + Math.floor(skill / 7)

      this.makers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        combsMade,
        material: MATERIALS[matIdx],
        teethFineness: 12 + skill * 0.71,
        reputation: 10 + skill * 0.78,
        tick,
      })
    }

    const cutoff = tick - 51500
    for (let i = this.makers.length - 1; i >= 0; i--) {
      if (this.makers[i].tick < cutoff) this.makers.splice(i, 1)
    }
  }

}
