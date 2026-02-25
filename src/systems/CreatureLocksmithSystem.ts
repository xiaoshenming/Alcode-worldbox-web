// Creature Locksmith System (v3.218) - Locksmiths craft locks, keys, and security devices
// Master locksmiths protect vaults and homes with intricate mechanisms

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type LockType = 'padlock' | 'deadbolt' | 'combination' | 'puzzle'

export interface Locksmith {
  id: number
  entityId: number
  skill: number
  locksMade: number
  lockType: LockType
  complexity: number
  pickResistance: number
  tick: number
}

const CHECK_INTERVAL = 1150
const CRAFT_CHANCE = 0.006
const MAX_LOCKSMITHS = 46
const SKILL_GROWTH = 0.08

const LOCK_TYPES: LockType[] = ['padlock', 'deadbolt', 'combination', 'puzzle']

export class CreatureLocksmithSystem {
  private locksmiths: Locksmith[] = []
  private nextId = 1
  private lastCheck = 0
  private skillMap = new Map<number, number>()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    const creatures = em.getEntitiesWithComponents('creature', 'position')

    for (const eid of creatures) {
      if (this.locksmiths.length >= MAX_LOCKSMITHS) break
      if (Math.random() > CRAFT_CHANCE) continue

      const c = em.getComponent<CreatureComponent>(eid, 'creature')
      if (!c || c.age < 10) continue

      let skill = this.skillMap.get(eid) ?? (3 + Math.random() * 10)
      skill = Math.min(100, skill + SKILL_GROWTH)
      this.skillMap.set(eid, skill)

      const typeIdx = Math.min(3, Math.floor(skill / 25))
      const lockType = LOCK_TYPES[typeIdx]
      const locksMade = 1 + Math.floor(skill / 12)
      const complexity = 10 + skill * 0.7 + Math.random() * 15

      this.locksmiths.push({
        id: this.nextId++,
        entityId: eid,
        skill,
        locksMade,
        lockType,
        complexity: Math.min(100, complexity),
        pickResistance: 5 + skill * 0.85 + Math.random() * 10,
        tick,
      })
    }

    const cutoff = tick - 41000
    for (let i = this.locksmiths.length - 1; i >= 0; i--) {
      if (this.locksmiths[i].tick < cutoff) {
        this.locksmiths.splice(i, 1)
      }
    }
  }

  getLocksmiths(): readonly Locksmith[] { return this.locksmiths }
  getSkill(eid: number): number { return this.skillMap.get(eid) ?? 0 }
}
