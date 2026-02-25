// Diplomatic Sovereignty System (v3.260) - Sovereignty recognition agreements
// Civilizations formally recognize each other's territorial sovereignty and autonomy

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type SovereigntyType = 'full' | 'limited' | 'conditional' | 'mutual'

export interface SovereigntyAgreement {
  id: number
  recognizerCivId: number
  recognizedCivId: number
  sovereigntyType: SovereigntyType
  legitimacy: number
  stabilityBonus: number
  territorialClarity: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2500
const TREATY_CHANCE = 0.003
const MAX_AGREEMENTS = 24

const TYPES: SovereigntyType[] = ['full', 'limited', 'conditional', 'mutual']

export class DiplomaticSovereigntySystem {
  private agreements: SovereigntyAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < TREATY_CHANCE) {
      const rec = 1 + Math.floor(Math.random() * 8)
      const recd = 1 + Math.floor(Math.random() * 8)
      if (rec === recd) return

      const sType = TYPES[Math.floor(Math.random() * TYPES.length)]

      this.agreements.push({
        id: this.nextId++,
        recognizerCivId: rec,
        recognizedCivId: recd,
        sovereigntyType: sType,
        legitimacy: 35 + Math.random() * 45,
        stabilityBonus: 10 + Math.random() * 30,
        territorialClarity: 30 + Math.random() * 40,
        duration: 0,
        tick,
      })
    }

    for (const agreement of this.agreements) {
      agreement.duration += 1
      agreement.legitimacy = Math.max(20, Math.min(100, agreement.legitimacy + (Math.random() - 0.45) * 0.12))
      agreement.stabilityBonus = Math.min(60, agreement.stabilityBonus + 0.01)
      agreement.territorialClarity = Math.max(15, Math.min(100, agreement.territorialClarity + (Math.random() - 0.48) * 0.1))
    }

    const cutoff = tick - 80000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

  getAgreements(): SovereigntyAgreement[] { return this.agreements }
}
