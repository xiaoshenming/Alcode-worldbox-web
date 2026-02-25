// Diplomatic Tribute System (v3.98) - Weaker nations pay tribute for protection
// Power disparity drives vassal-overlord relationships with varying tribute types

import { EntityManager } from '../ecs/Entity'

export type TributeType = 'gold' | 'food' | 'military' | 'technology' | 'artifacts'

export interface TributeAgreement {
  id: number
  type: TributeType
  vassal: string
  overlord: string
  amount: number
  satisfaction: number
  tick: number
}

const CHECK_INTERVAL = 2500
const TRIBUTE_CHANCE = 0.002
const MAX_TRIBUTES = 40
const SATISFACTION_DECAY = 0.3

const TRIBUTE_TYPES: TributeType[] = ['gold', 'food', 'military', 'technology', 'artifacts']
const CIVS = ['human', 'elf', 'dwarf', 'orc']

export class DiplomaticTributeSystem {
  private agreements: TributeAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    // Form new tribute agreements between mismatched powers
    if (this.agreements.length < MAX_TRIBUTES && Math.random() < TRIBUTE_CHANCE) {
      const vassal = CIVS[Math.floor(Math.random() * CIVS.length)]
      let overlord = CIVS[Math.floor(Math.random() * CIVS.length)]
      while (overlord === vassal) {
        overlord = CIVS[Math.floor(Math.random() * CIVS.length)]
      }

      // Avoid duplicate agreements
      const exists = this.agreements.some(
        a => a.vassal === vassal && a.overlord === overlord
      )
      if (!exists) {
        const type = TRIBUTE_TYPES[Math.floor(Math.random() * TRIBUTE_TYPES.length)]
        this.agreements.push({
          id: this.nextId++,
          type,
          vassal,
          overlord,
          amount: 10 + Math.floor(Math.random() * 50),
          satisfaction: 50 + Math.random() * 50,
          tick,
        })
      }
    }

    // Update satisfaction -- vassals grow resentful over time
    for (const a of this.agreements) {
      a.satisfaction = Math.max(0, a.satisfaction - SATISFACTION_DECAY)
      // Overlord satisfaction rises with tribute amount
      if (Math.random() < 0.1) {
        a.amount = Math.max(1, a.amount + Math.floor((Math.random() - 0.6) * 5))
      }
    }

    // Remove broken agreements (satisfaction depleted or very old)
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      const a = this.agreements[i]
      if (a.satisfaction <= 0 || tick - a.tick > 80000) {
        this.agreements.splice(i, 1)
      }
    }
  }

  getAgreements(): readonly TributeAgreement[] { return this.agreements }
  getVassalAgreements(civ: string): TributeAgreement[] {
    return this.agreements.filter(a => a.vassal === civ)
  }
}
