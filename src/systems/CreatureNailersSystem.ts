// Creature Nailers System (v3.273) - Nail makers and smiths
// Specialists who forge nails, tacks, and fasteners essential for construction

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type NailType = 'tack' | 'brad' | 'spike' | 'rivet'

export interface Nailer {
  id: number
  entityId: number
  skill: number
  nailsForged: number
  nailType: NailType
  strength: number
  reputation: number
  tick: number
}

const CHECK_INTERVAL = 1300
const CRAFT_CHANCE = 0.006
const MAX_NAILERS = 34
const SKILL_GROWTH = 0.07

const NAIL_TYPES: NailType[] = ['tack', 'brad', 'spike', 'rivet']

export class CreatureNailersSystem {
  private nailers: Nailer[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.nailers.length >= MAX_NAILERS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 9) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 7)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const nailsForged = 10 + Math.floor(skill / 3)

      this.nailers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        nailsForged,
        nailType: NAIL_TYPES[typeIdx],
        strength: 25 + skill * 0.6,
        reputation: 10 + skill * 0.7,
        tick,
      })
    }

    const cutoff = tick - 52000
    for (let i = this.nailers.length - 1; i >= 0; i--) {
      if (this.nailers[i].tick < cutoff) this.nailers.splice(i, 1)
    }
  }

  getNailers(): Nailer[] { return this.nailers }
}
