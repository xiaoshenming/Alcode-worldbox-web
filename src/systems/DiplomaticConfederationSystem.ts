// Diplomatic Confederation System (v3.185) - Loose alliances for mutual defense
// Multiple civilizations form confederations to share military strength

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface Confederation {
  id: number
  memberCivIds: number[]
  cohesion: number
  militaryStrength: number
  foundedTick: number
  leaderCivId: number
  treatyCount: number
  tick: number
}

const CHECK_INTERVAL = 4500
const SPAWN_CHANCE = 0.002
const MAX_CONFEDERATIONS = 6
const MIN_MEMBERS = 2
const MAX_MEMBERS = 6

export class DiplomaticConfederationSystem {
  private confederations: Confederation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Form new confederations
    if (this.confederations.length < MAX_CONFEDERATIONS && Math.random() < SPAWN_CHANCE) {
      const entities = em.getEntitiesWithComponent('creature')
      if (entities.length >= MIN_MEMBERS) {
        const count = MIN_MEMBERS + Math.floor(Math.random() * (MAX_MEMBERS - MIN_MEMBERS + 1))
        const shuffled = entities.slice().sort(() => Math.random() - 0.5)
        const members = shuffled.slice(0, Math.min(count, shuffled.length))
        const unique = [...new Set(members)]

        if (unique.length >= MIN_MEMBERS) {
          const leader = unique[0]
          this.confederations.push({
            id: this.nextId++,
            memberCivIds: unique,
            cohesion: 40 + Math.random() * 30,
            militaryStrength: unique.length * (10 + Math.random() * 20),
            foundedTick: tick,
            leaderCivId: leader,
            treatyCount: 1, tick,
          })
        }
      }
    }

    for (const conf of this.confederations) {
      // Cohesion fluctuates
      conf.cohesion = Math.max(0, Math.min(100, conf.cohesion + (Math.random() - 0.45) * 2.5))

      // Military strength scales with cohesion and members
      conf.militaryStrength = conf.memberCivIds.length * (conf.cohesion / 100) * 30

      // New treaties strengthen the confederation
      if (Math.random() < 0.01 * (conf.cohesion / 100)) {
        conf.treatyCount++
        conf.cohesion = Math.min(100, conf.cohesion + 2)
      }

      // Members may leave if cohesion is low
      if (conf.cohesion < 25 && conf.memberCivIds.length > MIN_MEMBERS && Math.random() < 0.02) {
        conf.memberCivIds.pop()
        conf.cohesion = Math.max(0, conf.cohesion - 5)
      }

      // Recruit new members if strong
      if (conf.cohesion > 70 && conf.memberCivIds.length < MAX_MEMBERS && Math.random() < 0.008) {
        const ents = em.getEntitiesWithComponent('creature')
        const cand = ents.length > 0 ? ents[Math.floor(Math.random() * ents.length)] : -1
        if (cand >= 0 && !conf.memberCivIds.includes(cand)) conf.memberCivIds.push(cand)
      }

      // Rotate leadership
      if (Math.random() < 0.005 && conf.memberCivIds.length > 1) {
        conf.leaderCivId = conf.memberCivIds[Math.floor(Math.random() * conf.memberCivIds.length)]
      }
    }

    // Remove collapsed confederations
    this.confederations = this.confederations.filter(
      c => c.cohesion > 3 && c.memberCivIds.length >= MIN_MEMBERS
    )
  }

  getConfederations(): readonly Confederation[] { return this.confederations }
}
