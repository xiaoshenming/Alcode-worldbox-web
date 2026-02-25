// Diplomatic Non-Aggression System (v3.155) - Civilizations negotiate and sign
// non-aggression pacts, reducing conflict and building trust over time

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export interface NonAggressionPact {
  id: number
  civIdA: number
  civIdB: number
  duration: number      // total agreed duration in ticks
  remaining: number     // ticks left before expiry
  trustLevel: number    // 0-100, mutual trust
  violations: number    // number of pact violations
  tick: number
}

const CHECK_INTERVAL = 5000
const SPAWN_CHANCE = 0.005
const MAX_PACTS = 12
const TRUST_GAIN_RATE = 0.8
const VIOLATION_TRUST_PENALTY = 25
const MIN_TRUST_FOR_RENEWAL = 40

export class DiplomaticNonAggressionSystem {
  private pacts: NonAggressionPact[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.negotiatePacts(em, tick)
    this.evolvePacts()
    this.cleanup()
  }

  private negotiatePacts(em: EntityManager, tick: number): void {
    if (this.pacts.length >= MAX_PACTS) return
    if (Math.random() > SPAWN_CHANCE) return

    // Find civilizations from entities with 'civilization' component
    const civEntities = em.getEntitiesWithComponents('civilization')
    if (civEntities.length < 2) return

    // Pick two random distinct civilizations
    const idxA = Math.floor(Math.random() * civEntities.length)
    let idxB = Math.floor(Math.random() * civEntities.length)
    if (idxA === idxB) idxB = (idxB + 1) % civEntities.length

    const civA = civEntities[idxA]
    const civB = civEntities[idxB]

    // Check no existing pact between these two
    const exists = this.pacts.some(
      p => (p.civIdA === civA && p.civIdB === civB) ||
           (p.civIdA === civB && p.civIdB === civA)
    )
    if (exists) return

    this.pacts.push({
      id: this.nextId++,
      civIdA: civA,
      civIdB: civB,
      duration: 3000 + Math.floor(Math.random() * 5000),
      remaining: 3000 + Math.floor(Math.random() * 5000),
      trustLevel: 20 + Math.random() * 30,
      violations: 0,
      tick,
    })
  }

  private evolvePacts(): void {
    for (const pact of this.pacts) {
      pact.remaining--

      // Trust grows over time if no violations
      if (pact.violations === 0) {
        pact.trustLevel += TRUST_GAIN_RATE
      } else {
        pact.trustLevel -= pact.violations * 0.5
      }
      pact.trustLevel = Math.max(0, Math.min(100, pact.trustLevel))

      // Random violation chance (lower trust = higher chance)
      if (Math.random() < 0.002 * (1 - pact.trustLevel / 100)) {
        pact.violations++
        pact.trustLevel = Math.max(0, pact.trustLevel - VIOLATION_TRUST_PENALTY)
      }

      // Auto-renew if trust is high enough at expiry
      if (pact.remaining <= 0 && pact.trustLevel >= MIN_TRUST_FOR_RENEWAL) {
        pact.remaining = pact.duration
        pact.violations = Math.max(0, pact.violations - 1)
      }
    }
  }

  private cleanup(): void {
    for (let i = this.pacts.length - 1; i >= 0; i--) {
      const pact = this.pacts[i]
      if (pact.remaining <= 0 || pact.trustLevel <= 0) {
        this.pacts.splice(i, 1)
      }
    }
  }

  getPacts(): NonAggressionPact[] { return this.pacts }
  getPactsByCiv(civId: number): NonAggressionPact[] {
    return this.pacts.filter(p => p.civIdA === civId || p.civIdB === civId)
  }
}
