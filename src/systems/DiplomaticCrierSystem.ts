// Diplomatic Crier System (v3.706) - Town crier governance
// Officers making public proclamations and announcements between kingdoms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type CrierForm = 'royal_crier' | 'borough_crier' | 'market_crier' | 'court_crier'

export interface CrierArrangement {
  id: number
  proclamationCivId: number
  audienceCivId: number
  form: CrierForm
  proclamationAuthority: number
  publicReach: number
  messageClarity: number
  ceremonialDuty: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2990
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: CrierForm[] = ['royal_crier', 'borough_crier', 'market_crier', 'court_crier']

export class DiplomaticCrierSystem {
  private arrangements: CrierArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const proclamation = 1 + Math.floor(Math.random() * 8)
      const audience = 1 + Math.floor(Math.random() * 8)
      if (proclamation === audience) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        proclamationCivId: proclamation,
        audienceCivId: audience,
        form,
        proclamationAuthority: 20 + Math.random() * 40,
        publicReach: 25 + Math.random() * 35,
        messageClarity: 10 + Math.random() * 30,
        ceremonialDuty: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.proclamationAuthority = Math.max(5, Math.min(85, a.proclamationAuthority + (Math.random() - 0.48) * 0.12))
      a.publicReach = Math.max(10, Math.min(90, a.publicReach + (Math.random() - 0.5) * 0.11))
      a.messageClarity = Math.max(5, Math.min(80, a.messageClarity + (Math.random() - 0.42) * 0.13))
      a.ceremonialDuty = Math.max(5, Math.min(65, a.ceremonialDuty + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

}
