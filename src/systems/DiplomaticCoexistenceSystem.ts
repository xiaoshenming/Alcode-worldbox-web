// Diplomatic Coexistence System (v3.487) - Peaceful coexistence
// Agreements for civilizations to live alongside each other without conflict

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type CoexistenceForm = 'territorial_respect' | 'cultural_tolerance' | 'resource_sharing' | 'mutual_recognition'

export interface CoexistenceAgreement {
  id: number
  civIdA: number
  civIdB: number
  form: CoexistenceForm
  toleranceLevel: number
  cooperationDepth: number
  conflictReduction: number
  culturalExchange: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2490
const PROCEED_CHANCE = 0.0024
const MAX_AGREEMENTS = 18

const FORMS: CoexistenceForm[] = ['territorial_respect', 'cultural_tolerance', 'resource_sharing', 'mutual_recognition']

export class DiplomaticCoexistenceSystem {
  private agreements: CoexistenceAgreement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.agreements.length < MAX_AGREEMENTS && Math.random() < PROCEED_CHANCE) {
      const civA = 1 + Math.floor(Math.random() * 8)
      const civB = 1 + Math.floor(Math.random() * 8)
      if (civA === civB) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.agreements.push({
        id: this.nextId++,
        civIdA: civA,
        civIdB: civB,
        form,
        toleranceLevel: 25 + Math.random() * 40,
        cooperationDepth: 20 + Math.random() * 35,
        conflictReduction: 15 + Math.random() * 30,
        culturalExchange: 10 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.agreements) {
      a.duration += 1
      a.toleranceLevel = Math.max(10, Math.min(90, a.toleranceLevel + (Math.random() - 0.47) * 0.12))
      a.cooperationDepth = Math.max(10, Math.min(85, a.cooperationDepth + (Math.random() - 0.5) * 0.11))
      a.conflictReduction = Math.max(5, Math.min(75, a.conflictReduction + (Math.random() - 0.45) * 0.10))
      a.culturalExchange = Math.max(5, Math.min(65, a.culturalExchange + (Math.random() - 0.44) * 0.09))
    }

    const cutoff = tick - 91000
    for (let i = this.agreements.length - 1; i >= 0; i--) {
      if (this.agreements[i].tick < cutoff) this.agreements.splice(i, 1)
    }
  }

  getAgreements(): CoexistenceAgreement[] { return this.agreements }
}
