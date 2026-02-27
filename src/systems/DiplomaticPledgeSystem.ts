// Diplomatic Pledge System (v3.43) - Civilizations make binding pledges to each other
// Pledges enforce cooperation; breaking a pledge damages reputation severely

import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { Civilization } from '../civilization/Civilization'

export type PledgeType = 'non_aggression' | 'resource_sharing' | 'mutual_defense' | 'border_respect' | 'trade_priority'

export interface DiplomaticPledge {
  id: number
  fromCivId: number
  toCivId: number
  type: PledgeType
  strength: number     // 0-100
  honored: boolean
  violations: number
  startTick: number
  duration: number
}

const CHECK_INTERVAL = 1300
const PLEDGE_CHANCE = 0.006
const MAX_PLEDGES = 40
const DECAY_RATE = 0.002
const VIOLATION_PENALTY = 20

const TYPES: PledgeType[] = ['non_aggression', 'resource_sharing', 'mutual_defense', 'border_respect', 'trade_priority']

export class DiplomaticPledgeSystem {
  private pledges: DiplomaticPledge[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (!civManager?.civilizations) return
    const civs: Civilization[] = []
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 2) return

    // Form new pledges
    if (this.pledges.length < MAX_PLEDGES && Math.random() < PLEDGE_CHANCE) {
      const civA = civs[Math.floor(Math.random() * civs.length)]
      const civB = civs[Math.floor(Math.random() * civs.length)]
      if (civA.id !== civB.id) {
        const existing = this.pledges.find(
          p => p.fromCivId === civA.id && p.toCivId === civB.id && p.strength > 0
        )
        if (!existing) {
          const type = TYPES[Math.floor(Math.random() * TYPES.length)]
          this.pledges.push({
            id: this.nextId++,
            fromCivId: civA.id,
            toCivId: civB.id,
            type,
            strength: 50 + Math.random() * 40,
            honored: true,
            violations: 0,
            startTick: tick,
            duration: 4000 + Math.random() * 6000,
          })
        }
      }
    }

    // Update pledges
    for (const pledge of this.pledges) {
      pledge.strength -= DECAY_RATE * CHECK_INTERVAL

      // Random violation chance
      if (Math.random() < 0.003) {
        pledge.violations++
        pledge.strength -= VIOLATION_PENALTY
        pledge.honored = false
      }

      // Expire
      const elapsed = tick - pledge.startTick
      if (elapsed > pledge.duration) {
        pledge.strength = 0
      }
    }

    // Clean up dead pledges
    this.pledges = this.pledges.filter(p => p.strength > 0)
  }

  getPledges(): DiplomaticPledge[] {
    return this.pledges
  }

  getByCiv(civId: number): DiplomaticPledge[] {
    return this.pledges.filter(p => p.fromCivId === civId || p.toCivId === civId)
  }
}
