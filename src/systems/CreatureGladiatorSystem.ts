// Creature Gladiator System (v3.151) - Arena combat for glory and fame
// Creatures fight in gladiatorial arenas, gaining wins, losses, and fame

import { EntityManager } from '../ecs/Entity'

export type WeaponSkill = 'sword' | 'spear' | 'axe' | 'fists' | 'trident'

export interface Gladiator {
  id: number
  entityId: number
  wins: number
  losses: number
  fame: number
  weaponSkill: WeaponSkill
  arenaId: number
  tick: number
}

const CHECK_INTERVAL = 3200
const ASSIGN_CHANCE = 0.003
const MAX_GLADIATORS = 12

const WEAPONS: WeaponSkill[] = ['sword', 'spear', 'axe', 'fists', 'trident']
const WEAPON_POWER: Record<WeaponSkill, number> = {
  sword: 50, spear: 45, axe: 55, fists: 30, trident: 60,
}

export class CreatureGladiatorSystem {
  private gladiators: Gladiator[] = []
  private nextId = 1
  private lastCheck = 0
  private _byArena: Map<number, Gladiator[]> = new Map()

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Recruit new gladiators
    if (this.gladiators.length < MAX_GLADIATORS && Math.random() < ASSIGN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const already = this.gladiators.some(g => g.entityId === eid)
        if (!already) {
          const weapon = WEAPONS[Math.floor(Math.random() * WEAPONS.length)]
          this.gladiators.push({
            id: this.nextId++,
            entityId: eid,
            wins: 0,
            losses: 0,
            fame: 0,
            weaponSkill: weapon,
            arenaId: Math.floor(Math.random() * 5),
            tick,
          })
        }
      }
    }

    // Simulate arena bouts between gladiators in the same arena
    const byArena = this._byArena
    byArena.clear()
    for (const g of this.gladiators) {
      let list = byArena.get(g.arenaId)
      if (!list) { list = []; byArena.set(g.arenaId, list) }
      list.push(g)
    }

    for (const fighters of byArena.values()) {
      if (fighters.length < 2 || Math.random() > 0.02) continue
      const a = fighters[Math.floor(Math.random() * fighters.length)]
      let b = fighters[Math.floor(Math.random() * fighters.length)]
      if (a.id === b.id) continue

      const powerA = WEAPON_POWER[a.weaponSkill] + a.wins * 2
      const powerB = WEAPON_POWER[b.weaponSkill] + b.wins * 2
      const roll = Math.random() * (powerA + powerB)

      if (roll < powerA) {
        a.wins++
        b.losses++
        a.fame = Math.min(100, a.fame + 1.5)
        b.fame = Math.max(0, b.fame - 0.5)
      } else {
        b.wins++
        a.losses++
        b.fame = Math.min(100, b.fame + 1.5)
        a.fame = Math.max(0, a.fame - 0.5)
      }
    }

    // Remove gladiators whose creatures no longer exist
    for (let i = this.gladiators.length - 1; i >= 0; i--) {
      if (!em.hasComponent(this.gladiators[i].entityId, 'creature')) this.gladiators.splice(i, 1)
    }
  }

}
