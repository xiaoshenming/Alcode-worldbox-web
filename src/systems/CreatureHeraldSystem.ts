// Creature Herald System (v3.119) - Heralds announce major events to settlements
// They boost morale and spread news across the world

import { EntityManager } from '../ecs/Entity'

export type HeraldRank = 'town_crier' | 'royal_herald' | 'grand_herald' | 'legendary'

export interface Herald {
  id: number
  creatureId: number
  rank: HeraldRank
  reach: number
  moraleBoost: number
  announcements: number
  age: number
  tick: number
}

const CHECK_INTERVAL = 2800
const RECRUIT_CHANCE = 0.003
const MAX_HERALDS = 20

const RANKS: HeraldRank[] = ['town_crier', 'royal_herald', 'grand_herald', 'legendary']
const RANK_REACH: Record<HeraldRank, number> = {
  town_crier: 10, royal_herald: 25, grand_herald: 50, legendary: 100,
}
const RANK_MORALE: Record<HeraldRank, number> = {
  town_crier: 3, royal_herald: 8, grand_herald: 15, legendary: 25,
}

export class CreatureHeraldSystem {
  private heralds: Herald[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Recruit heralds from creatures
    if (this.heralds.length < MAX_HERALDS && Math.random() < RECRUIT_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const rank = RANKS[Math.floor(Math.random() * RANKS.length)]
        this.heralds.push({
          id: this.nextId++,
          creatureId: eid,
          rank,
          reach: RANK_REACH[rank],
          moraleBoost: RANK_MORALE[rank],
          announcements: 0,
          age: 0,
          tick,
        })
      }
    }

    // Heralds make announcements periodically
    for (const h of this.heralds) {
      h.age = tick - h.tick
      if (Math.random() < 0.01) {
        h.announcements++
        // Promotion after many announcements
        if (h.announcements > 50 && h.rank === 'town_crier') {
          h.rank = 'royal_herald'
          h.reach = RANK_REACH.royal_herald
          h.moraleBoost = RANK_MORALE.royal_herald
        } else if (h.announcements > 150 && h.rank === 'royal_herald') {
          h.rank = 'grand_herald'
          h.reach = RANK_REACH.grand_herald
          h.moraleBoost = RANK_MORALE.grand_herald
        }
      }
    }

    // Remove heralds of dead creatures
    const alive = new Set(em.getEntitiesWithComponent('creature'))
    for (let i = this.heralds.length - 1; i >= 0; i--) {
      if (!alive.has(this.heralds[i].creatureId)) this.heralds.splice(i, 1)
    }
  }

  getHeralds(): readonly Herald[] { return this.heralds }
}
