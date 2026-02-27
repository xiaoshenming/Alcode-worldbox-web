// Diplomatic Compromise System (v3.466) - Compromise diplomacy
// Mutual concessions between civilizations to reach balanced agreements

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type CompromiseStatus = 'proposing' | 'counter_offer' | 'accepted' | 'rejected'

export interface CompromiseAgreement {
  id: number
  civIdA: number
  civIdB: number
  status: CompromiseStatus
  concessionA: number
  concessionB: number
  satisfaction: number
  rounds: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2560
const INITIATE_CHANCE = 0.002
const MAX_AGREEMENTS = 16

export class DiplomaticCompromiseSystem {
  private agreements: CompromiseAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < INITIATE_CHANCE) {
      const a = 1 + Math.floor(Math.random() * 8)
      const b = 1 + Math.floor(Math.random() * 8)
      if (a === b) return

      this.agreements.push({
        id: this.nextId++,
        civIdA: a,
        civIdB: b,
        status: 'proposing',
        concessionA: 10 + Math.random() * 30,
        concessionB: 10 + Math.random() * 30,
        satisfaction: 0,
        rounds: 0,
        duration: 0,
        tick,
      })
    }

    for (const a of this.agreements) {
      a.duration++
      if (a.status === 'proposing' && Math.random() < 0.1) {
        a.status = 'counter_offer'
        a.rounds++
      }
      if (a.status === 'counter_offer') {
        a.concessionA = Math.min(100, a.concessionA + 0.5)
        a.concessionB = Math.min(100, a.concessionB + 0.5)
        a.satisfaction = (a.concessionA + a.concessionB) / 2
        if (a.satisfaction > 60) a.status = 'accepted'
        if (a.rounds > 10 && a.satisfaction < 30) a.status = 'rejected'
      }
    }

    for (let _i = this.agreements.length - 1; _i >= 0; _i--) { if (!((a) => a.status === 'proposing' || a.status === 'counter_offer')(this.agreements[_i])) this.agreements.splice(_i, 1) }
  }

  getAgreements(): CompromiseAgreement[] { return this.agreements }
}
