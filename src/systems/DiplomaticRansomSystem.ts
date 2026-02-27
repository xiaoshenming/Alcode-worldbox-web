// Diplomatic Ransom System (v3.145) - Ransom negotiations for prisoner release
// Civilizations negotiate ransoms through multiple rounds of bargaining

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { Civilization } from '../civilization/Civilization'

export type RansomStatus = 'demanding' | 'negotiating' | 'paid' | 'refused'

export interface RansomNegotiation {
  id: number
  captor: number
  captive: number
  prisoner: number
  demandedAmount: number
  offeredAmount: number
  rounds: number
  status: RansomStatus
  tick: number
}

const CHECK_INTERVAL = 3600
const SPAWN_CHANCE = 0.002
const MAX_NEGOTIATIONS = 8

export class DiplomaticRansomSystem {
  private negotiations: RansomNegotiation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number, civManager?: CivManager): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (!civManager?.civilizations) return
    const civs: Civilization[] = []
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 2) return

    // Initiate new ransom demands
    if (this.negotiations.length < MAX_NEGOTIATIONS && Math.random() < SPAWN_CHANCE) {
      const iA = Math.floor(Math.random() * civs.length)
      let iB = Math.floor(Math.random() * civs.length)
      if (iB === iA) iB = (iB + 1) % civs.length

      this.negotiations.push({
        id: this.nextId++,
        captor: civs[iA].id,
        captive: civs[iB].id,
        prisoner: Math.floor(Math.random() * 10000),
        demandedAmount: 50 + Math.floor(Math.random() * 150),
        offeredAmount: 0,
        rounds: 0,
        status: 'demanding',
        tick,
      })
    }

    // Process negotiation rounds
    for (const n of this.negotiations) {
      if (n.status === 'paid' || n.status === 'refused') continue

      if (n.status === 'demanding' && Math.random() < 0.1) {
        n.status = 'negotiating'
        n.offeredAmount = Math.floor(n.demandedAmount * (0.2 + Math.random() * 0.3))
        n.rounds++
      } else if (n.status === 'negotiating') {
        n.rounds++
        // Captor lowers demand, captive raises offer
        n.demandedAmount = Math.max(10, n.demandedAmount * 0.9)
        n.offeredAmount = Math.min(n.demandedAmount, n.offeredAmount * 1.15)

        if (n.offeredAmount >= n.demandedAmount * 0.85) {
          n.status = 'paid'
        } else if (n.rounds > 8 && Math.random() < 0.3) {
          n.status = 'refused'
        }
      }
    }

    // Clean up resolved negotiations
    for (let i = this.negotiations.length - 1; i >= 0; i--) {
      const n = this.negotiations[i]
      const resolved = n.status === 'paid' || n.status === 'refused'
      if (resolved && tick - n.tick > 5000) {
        this.negotiations.splice(i, 1)
      }
    }
  }

  getNegotiations(): readonly RansomNegotiation[] { return this.negotiations }
}
