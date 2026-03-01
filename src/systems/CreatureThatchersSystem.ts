// Creature Thatchers System (v3.241) - Thatchers build and repair straw roofs
// Skilled roofers who use dried vegetation to create weatherproof coverings

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type ThatchMaterial = 'straw' | 'reed' | 'palm' | 'heather'

export interface Thatcher {
  id: number
  entityId: number
  skill: number
  roofsBuilt: number
  material: ThatchMaterial
  weatherproofing: number
  lifespan: number
  tick: number
}

const CHECK_INTERVAL = 1350
const CRAFT_CHANCE = 0.006
const MAX_THATCHERS = 36
const SKILL_GROWTH = 0.07

const MATERIALS: ThatchMaterial[] = ['straw', 'reed', 'palm', 'heather']

export class CreatureThatchersSystem {
  private thatchers: Thatcher[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.thatchers.length >= MAX_THATCHERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 8) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const matIdx = Math.min(3, Math.floor(skill / 25))
      const roofsBuilt = 1 + Math.floor(skill / 14)

      this.thatchers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        roofsBuilt,
        material: MATERIALS[matIdx],
        weatherproofing: 25 + skill * 0.65,
        lifespan: 10 + skill * 0.8,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.thatchers.length - 1; i >= 0; i--) {
      if (this.thatchers[i].tick < cutoff) this.thatchers.splice(i, 1)
    }
  }

}
