// Diplomatic War Reparations System (v3.150) - Defeated side pays reparations
// Payments are tracked over time; defaulting may trigger new conflicts

import { Civilization } from '../civilization/Civilization'
import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'

export type ReparationPhase = 'negotiating' | 'paying' | 'defaulted' | 'completed'

export interface WarReparation {
  id: number
  payerCivId: number
  receiverCivId: number
  amount: number
  paid: number
  remaining: number
  duration: number
  phase: ReparationPhase
  tick: number
}

const CHECK_INTERVAL = 3600
const SPAWN_CHANCE = 0.002
const MAX_REPARATIONS = 10

export class DiplomaticWarReparationsSystem {
  private reparations: WarReparation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (!civManager?.civilizations) return
    const civs: Civilization[] = []
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 2) return

    // Initiate new reparation agreements
    if (this.reparations.length < MAX_REPARATIONS && Math.random() < SPAWN_CHANCE) {
      const iA = Math.floor(Math.random() * civs.length)
      let iB = Math.floor(Math.random() * civs.length)
      if (iB === iA) iB = (iB + 1) % civs.length

      const totalAmount = 80 + Math.floor(Math.random() * 200)
      this.reparations.push({
        id: this.nextId++,
        payerCivId: civs[iA].id,
        receiverCivId: civs[iB].id,
        amount: totalAmount,
        paid: 0,
        remaining: totalAmount,
        duration: 5000 + Math.floor(Math.random() * 5000),
        phase: 'negotiating',
        tick,
      })
    }

    // Process reparation lifecycle
    for (const r of this.reparations) {
      const age = tick - r.tick

      if (r.phase === 'negotiating' && age > 2000) {
        r.phase = 'paying'
      }

      if (r.phase === 'paying') {
        const payment = Math.min(r.remaining, r.amount * 0.02)
        r.paid += payment
        r.remaining = Math.max(0, r.amount - r.paid)

        if (r.remaining <= 0) {
          r.phase = 'completed'
        } else if (age > r.duration && r.remaining > r.amount * 0.3) {
          r.phase = 'defaulted'
        }
      }
    }

    // Clean up old resolved reparations
    for (let i = this.reparations.length - 1; i >= 0; i--) {
      const r = this.reparations[i]
      const age = tick - r.tick
      const done = r.phase === 'completed' || r.phase === 'defaulted'
      if (done && age > 8000) {
        this.reparations.splice(i, 1)
      }
    }
  }

  getReparations(): readonly WarReparation[] { return this.reparations }
}
