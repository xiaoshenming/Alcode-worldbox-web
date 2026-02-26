// Diplomatic Escheator System (v3.631) - Escheator governance
// Royal officers managing forfeited and lapsed estates between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type EscheatorForm = 'royal_escheator' | 'county_escheator' | 'duchy_escheator' | 'palatine_escheator'

export interface EscheatorArrangement {
  id: number
  crownCivId: number
  escheatorCivId: number
  form: EscheatorForm
  estateRecovery: number
  forfeitureAuthority: number
  inventoryAccuracy: number
  revenueYield: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2780
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: EscheatorForm[] = ['royal_escheator', 'county_escheator', 'duchy_escheator', 'palatine_escheator']

export class DiplomaticEscheatorSystem {
  private arrangements: EscheatorArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const crown = 1 + Math.floor(Math.random() * 8)
      const escheator = 1 + Math.floor(Math.random() * 8)
      if (crown === escheator) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        crownCivId: crown,
        escheatorCivId: escheator,
        form,
        estateRecovery: 20 + Math.random() * 40,
        forfeitureAuthority: 25 + Math.random() * 35,
        inventoryAccuracy: 10 + Math.random() * 30,
        revenueYield: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.estateRecovery = Math.max(5, Math.min(85, a.estateRecovery + (Math.random() - 0.48) * 0.12))
      a.forfeitureAuthority = Math.max(10, Math.min(90, a.forfeitureAuthority + (Math.random() - 0.5) * 0.11))
      a.inventoryAccuracy = Math.max(5, Math.min(80, a.inventoryAccuracy + (Math.random() - 0.42) * 0.13))
      a.revenueYield = Math.max(5, Math.min(65, a.revenueYield + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): EscheatorArrangement[] { return this.arrangements }
}
