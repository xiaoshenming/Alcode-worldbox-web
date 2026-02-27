// Creature Gambler System (v3.148) - Creatures gamble, affecting wealth distribution
// Luck and win streaks influence outcomes; compulsive gamblers risk ruin

import { EntityManager } from '../ecs/Entity'

export interface Gambler {
  id: number
  entityId: number
  luck: number
  wealth: number
  gamesPlayed: number
  winStreak: number
  tick: number
}

const CHECK_INTERVAL = 3000
const ASSIGN_CHANCE = 0.004
const MAX_GAMBLERS = 15

const BASE_WIN_CHANCE = 0.4
const STREAK_BONUS = 0.02
const MAX_STREAK_BONUS = 0.15

export class CreatureGamblerSystem {
  private gamblers: Gambler[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Recruit new gamblers
    if (this.gamblers.length < MAX_GAMBLERS && Math.random() < ASSIGN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length > 0) {
        const eid = entities[Math.floor(Math.random() * entities.length)]
        const already = this.gamblers.some(g => g.entityId === eid)
        if (!already) {
          this.gamblers.push({
            id: this.nextId++,
            entityId: eid,
            luck: 20 + Math.floor(Math.random() * 60),
            wealth: 50 + Math.floor(Math.random() * 100),
            gamesPlayed: 0,
            winStreak: 0,
            tick,
          })
        }
      }
    }

    // Gamblers play rounds
    for (const g of this.gamblers) {
      if (Math.random() < 0.025) {
        g.gamesPlayed++
        const streakBonus = Math.min(MAX_STREAK_BONUS, g.winStreak * STREAK_BONUS)
        const winChance = BASE_WIN_CHANCE + (g.luck / 500) + streakBonus
        const bet = Math.max(1, Math.floor(g.wealth * 0.1))

        if (Math.random() < winChance) {
          g.wealth += bet
          g.winStreak++
          g.luck = Math.min(100, g.luck + 0.2)
        } else {
          g.wealth = Math.max(0, g.wealth - bet)
          g.winStreak = 0
          g.luck = Math.max(0, g.luck - 0.1)
        }
      }
    }

    // Remove gamblers whose creatures no longer exist or went bankrupt
    for (let i = this.gamblers.length - 1; i >= 0; i--) {
      const g = this.gamblers[i]
      if (!em.hasComponent(g.entityId, 'creature') || (g.wealth <= 0 && g.gamesPlayed > 10)) {
        this.gamblers.splice(i, 1)
      }
    }
  }

  getGamblers(): readonly Gambler[] { return this.gamblers }
}
