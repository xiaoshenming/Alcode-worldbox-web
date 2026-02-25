// Diplomatic Protectorate System (v3.290) - Protectorate relationships
// Agreements where a stronger civilization provides protection to a weaker one

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type ProtectorateType = 'military' | 'economic' | 'cultural' | 'full'

export interface ProtectorateAgreement {
  id: number
  protectorCivId: number
  protectedCivId: number
  protectorateType: ProtectorateType
  autonomy: number
  protectionLevel: number
  tributeRate: number
  satisfaction: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2600
const TREATY_CHANCE = 0.0025
const MAX_AGREEMENTS = 18

const TYPES: ProtectorateType[] = ['military', 'economic', 'cultural', 'full']

export class DiplomaticProtectorateSystem {
  private agreements: ProtectorateAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < TREATY_CHANCE) {
      const protector = 1 + Math.floor(Math.random() * 8)
      const protected_ = 1 + Math.floor(Math.random() * 8)
      if (protector === protected_) return

      const pType = TYPES[Math.floor(Math.random() * TYPES.length)]

      this.agreements.push({
        id: this.nextId++,
        protectorCivId: protector,
        protectedCivId: protected_,
        protectorateType: pType,
        autonomy: pType === 'full' ? 15 + Math.random() * 25 : 40 + Math.random() * 35,
        protectionLevel: 40 + Math.random() * 40,
        tributeRate: 5 + Math.random() * 20,
        satisfaction: 30 + Math.random() * 40,
        duration: 0,
        tick,
      })
    }

    for (const agreement of this.agreements) {
      agreement.duration += 1
      agreement.autonomy = Math.max(5, Math.min(80, agreement.autonomy + (Math.random() - 0.48) * 0.15))
      agreement.protectionLevel = Math.max(10, Math.min(100, agreement.protectionLevel + (Math.random() - 0.5) * 0.12))
      agreement.satisfaction = Math.max(5, Math.min(100, agreement.satisfaction + (Math.random() - 0.5) * 0.18))
      agreement.tributeRate = Math.max(2, Math.min(30, agreement.tributeRate + (Math.random() - 0.5) * 0.08))
    }

    const cutoff = tick - 85000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

  getAgreements(): ProtectorateAgreement[] { return this.agreements }
}
