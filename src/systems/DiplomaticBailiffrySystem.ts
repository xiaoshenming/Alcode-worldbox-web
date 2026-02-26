// Diplomatic Bailiffry System (v3.622) - Bailiffry governance
// Bailiffs managing law enforcement and property administration between realms

import { World } from '../game/World'
import { EntityManager } from '../ecs/Entity'

export type BailiffryForm = 'law_bailiffry' | 'property_bailiffry' | 'court_bailiffry' | 'revenue_bailiffry'

export interface BailiffryArrangement {
  id: number
  realmCivId: number
  bailiffCivId: number
  form: BailiffryForm
  lawEnforcement: number
  propertyAdmin: number
  courtAuthority: number
  revenueRecovery: number
  duration: number
  tick: number
}

const CHECK_INTERVAL = 2750
const PROCEED_CHANCE = 0.0021
const MAX_ARRANGEMENTS = 16

const FORMS: BailiffryForm[] = ['law_bailiffry', 'property_bailiffry', 'court_bailiffry', 'revenue_bailiffry']

export class DiplomaticBailiffrySystem {
  private arrangements: BailiffryArrangement[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: World, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (this.arrangements.length < MAX_ARRANGEMENTS && Math.random() < PROCEED_CHANCE) {
      const realm = 1 + Math.floor(Math.random() * 8)
      const bailiff = 1 + Math.floor(Math.random() * 8)
      if (realm === bailiff) return

      const form = FORMS[Math.floor(Math.random() * FORMS.length)]

      this.arrangements.push({
        id: this.nextId++,
        realmCivId: realm,
        bailiffCivId: bailiff,
        form,
        lawEnforcement: 20 + Math.random() * 40,
        propertyAdmin: 25 + Math.random() * 35,
        courtAuthority: 10 + Math.random() * 30,
        revenueRecovery: 15 + Math.random() * 25,
        duration: 0,
        tick,
      })
    }

    for (const a of this.arrangements) {
      a.duration += 1
      a.lawEnforcement = Math.max(5, Math.min(85, a.lawEnforcement + (Math.random() - 0.48) * 0.12))
      a.propertyAdmin = Math.max(10, Math.min(90, a.propertyAdmin + (Math.random() - 0.5) * 0.11))
      a.courtAuthority = Math.max(5, Math.min(80, a.courtAuthority + (Math.random() - 0.42) * 0.13))
      a.revenueRecovery = Math.max(5, Math.min(65, a.revenueRecovery + (Math.random() - 0.46) * 0.09))
    }

    const cutoff = tick - 88000
    for (let i = this.arrangements.length - 1; i >= 0; i--) {
      if (this.arrangements[i].tick < cutoff) this.arrangements.splice(i, 1)
    }
  }

  getArrangements(): BailiffryArrangement[] { return this.arrangements }
}
