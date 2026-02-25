// Diplomatic Conciliation System (v3.245) - Reconciliation after conflicts
// Post-war healing process where civilizations rebuild trust and normalize relations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ConciliationType = 'reparations' | 'prisoner_exchange' | 'cultural_exchange' | 'joint_project'

export interface Conciliation {
  id: number
  initiatorCivId: number
  recipientCivId: number
  conciliationType: ConciliationType
  goodwill: number
  progress: number
  reparationsPaid: number
  status: 'active' | 'completed' | 'rejected'
  tick: number
}

const CHECK_INTERVAL = 2500
const CONCILIATE_CHANCE = 0.003
const MAX_CONCILIATIONS = 24

const TYPES: ConciliationType[] = ['reparations', 'prisoner_exchange', 'cultural_exchange', 'joint_project']

export class DiplomaticConciliationSystem {
  private conciliations: Conciliation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.conciliations.length < MAX_CONCILIATIONS && Math.random() < CONCILIATE_CHANCE) {
      const initiator = 1 + Math.floor(Math.random() * 8)
      const recipient = 1 + Math.floor(Math.random() * 8)
      if (initiator === recipient) return

      const conciliationType = TYPES[Math.floor(Math.random() * TYPES.length)]

      this.conciliations.push({
        id: this.nextId++,
        initiatorCivId: initiator,
        recipientCivId: recipient,
        conciliationType,
        goodwill: 5 + Math.random() * 20,
        progress: 0,
        reparationsPaid: conciliationType === 'reparations' ? 10 + Math.random() * 50 : 0,
        status: 'active',
        tick,
      })
    }

    for (const con of this.conciliations) {
      if (con.status !== 'active') continue
      con.progress = Math.min(100, con.progress + 0.06 + con.goodwill * 0.003)
      con.goodwill = Math.min(100, con.goodwill + 0.04)

      if (con.progress >= 95) {
        con.status = Math.random() < 0.8 ? 'completed' : 'rejected'
      }
    }

    const cutoff = tick - 78000
    for (let i = this.conciliations.length - 1; i >= 0; i--) {
      if (this.conciliations[i].tick < cutoff) this.conciliations.splice(i, 1)
    }
  }

  getConciliations(): Conciliation[] { return this.conciliations }
}
