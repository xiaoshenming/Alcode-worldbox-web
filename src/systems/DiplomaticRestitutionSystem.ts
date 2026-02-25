// Diplomatic Restitution System (v3.270) - Property and territory restitution
// Agreements to return seized assets, lands, or cultural artifacts between civilizations

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type RestitutionType = 'territorial' | 'cultural' | 'economic' | 'prisoners'

export interface RestitutionAgreement {
  id: number
  claimantCivId: number
  holderCivId: number
  restitutionType: RestitutionType
  itemsToReturn: number
  itemsReturned: number
  compliance: number
  tension: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2400
const TREATY_CHANCE = 0.003
const MAX_AGREEMENTS = 22

const TYPES: RestitutionType[] = ['territorial', 'cultural', 'economic', 'prisoners']

export class DiplomaticRestitutionSystem {
  private agreements: RestitutionAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < TREATY_CHANCE) {
      const claimant = 1 + Math.floor(Math.random() * 8)
      const holder = 1 + Math.floor(Math.random() * 8)
      if (claimant === holder) return

      const rType = TYPES[Math.floor(Math.random() * TYPES.length)]

      this.agreements.push({
        id: this.nextId++,
        claimantCivId: claimant,
        holderCivId: holder,
        restitutionType: rType,
        itemsToReturn: 5 + Math.floor(Math.random() * 20),
        itemsReturned: 0,
        compliance: 30 + Math.random() * 40,
        tension: 30 + Math.random() * 40,
        duration: 0,
        tick,
      })
    }

    for (const agreement of this.agreements) {
      agreement.duration += 1
      if (Math.random() < agreement.compliance * 0.005) {
        agreement.itemsReturned = Math.min(agreement.itemsToReturn, agreement.itemsReturned + 1)
      }
      agreement.compliance = Math.max(5, Math.min(100, agreement.compliance + (Math.random() - 0.45) * 0.2))
      agreement.tension = Math.max(5, Math.min(100, agreement.tension + (Math.random() - 0.5) * 0.15))
    }

    const cutoff = tick - 82000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

  getAgreements(): RestitutionAgreement[] { return this.agreements }
}
