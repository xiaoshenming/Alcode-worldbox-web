// Creature Gilders System (v3.236) - Gilders apply gold leaf to surfaces
// Artisans who decorate buildings, furniture, and artwork with thin gold layers

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type GildingTarget = 'furniture' | 'architecture' | 'sculpture' | 'manuscript'

export interface Gilder {
  id: number
  entityId: number
  skill: number
  piecesGilded: number
  target: GildingTarget
  goldUsed: number
  precision: number
  tick: number
}

const CHECK_INTERVAL = 1400
const CRAFT_CHANCE = 0.006
const MAX_GILDERS = 34
const SKILL_GROWTH = 0.07

const TARGETS: GildingTarget[] = ['furniture', 'architecture', 'sculpture', 'manuscript']

export class CreatureGildersSystem {
  private gilders: Gilder[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.gilders.length >= MAX_GILDERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (2 + Math.random() * 8)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const targetIdx = Math.min(3, Math.floor(skill / 25))
      const piecesGilded = 1 + Math.floor(skill / 15)

      this.gilders.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        piecesGilded,
        target: TARGETS[targetIdx],
        goldUsed: 0.5 + skill * 0.03,
        precision: 20 + skill * 0.7,
        tick,
      })
    }

    const cutoff = tick - 55000
    for (let i = this.gilders.length - 1; i >= 0; i--) {
      if (this.gilders[i].tick < cutoff) this.gilders.splice(i, 1)
    }
  }

  getGilders(): Gilder[] { return this.gilders }
}
