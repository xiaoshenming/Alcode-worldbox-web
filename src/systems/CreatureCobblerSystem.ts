// Creature Cobbler System (v3.258) - Cobblers craft and repair footwear
// Skilled leatherworkers who make boots, shoes, and sandals for the populace

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type FootwearType = 'sandal' | 'shoe' | 'boot' | 'armored'

export interface Cobbler {
  id: number
  entityId: number
  skill: number
  pairsCompleted: number
  footwearType: FootwearType
  durability: number
  comfort: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.006
const MAX_COBBLERS = 34
const SKILL_GROWTH = 0.07

const FOOTWEAR_TYPES: FootwearType[] = ['sandal', 'shoe', 'boot', 'armored']

export class CreatureCobblersSystem {
  private cobblers: Cobbler[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.cobblers.length >= MAX_COBBLERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 8) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const pairsCompleted = 1 + Math.floor(skill / 10)

      this.cobblers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        pairsCompleted,
        footwearType: FOOTWEAR_TYPES[typeIdx],
        durability: 25 + skill * 0.65,
        comfort: 20 + skill * 0.7,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.cobblers.length - 1; i >= 0; i--) {
      if (this.cobblers[i].tick < cutoff) this.cobblers.splice(i, 1)
    }
  }

}
