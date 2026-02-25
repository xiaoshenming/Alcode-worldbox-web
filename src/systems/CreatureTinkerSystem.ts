// Creature Tinker System (v3.188) - Wandering tinkers repair tools and structures
// Tinkers travel between settlements mending broken items for trade goods

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type TinkerSpecialty = 'metal' | 'wood' | 'leather' | 'ceramic'

export interface Tinker {
  id: number
  entityId: number
  skill: number
  itemsRepaired: number
  toolsOwned: number
  specialty: TinkerSpecialty
  wandering: boolean
  tick: number
}

const CHECK_INTERVAL = 1300
const TINKER_CHANCE = 0.005
const MAX_TINKERS = 50
const SKILL_GROWTH = 0.09

const SPECIALTIES: TinkerSpecialty[] = ['metal', 'wood', 'leather', 'ceramic']

export class CreatureTinkerSystem {
  private tinkers: Tinker[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.tinkers.length >= MAX_TINKERS) break
      if (Math.random() > TINKER_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 12) continue

      let skill = this.skillMap.get(eid) ?? (4 + Math.random() * 10)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const specialty = SPECIALTIES[Math.floor(Math.random() * SPECIALTIES.length)]
      const itemsRepaired = Math.floor(skill / 10)
      const toolsOwned = 1 + Math.floor(skill / 30)

      this.tinkers.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        itemsRepaired,
        toolsOwned,
        specialty,
        wandering: Math.random() < 0.6,
        tick,
      })
    }

    // Wandering tinkers move on after a while
    for (const t of this.tinkers) {
      if (t.wandering && Math.random() < 0.02) {
        t.itemsRepaired += Math.floor(t.skill / 15)
      }
    }

    // Expire old tinker records
    const cutoff = tick - 40000
    for (let i = this.tinkers.length - 1; i >= 0; i--) {
      if (this.tinkers[i].tick < cutoff) {
        this.tinkers.splice(i, 1)
      }
    }
  }

  getTinkers(): readonly Tinker[] { return this.tinkers }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
