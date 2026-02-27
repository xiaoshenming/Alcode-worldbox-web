// Diplomatic War Reparations System (v3.33) - Losers pay reparations after wars
// Defeated civilizations transfer resources to victors over time

import { Civilization } from '../civilization/Civilization'
import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'

export type ReparationStatus = 'active' | 'defaulted' | 'completed'

export interface WarReparation {
  id: number
  loserCivId: number
  victorCivId: number
  totalAmount: number
  paidAmount: number
  status: ReparationStatus
  startTick: number
  deadline: number
}

const CHECK_INTERVAL = 1500
const REPARATION_CHANCE = 0.02
const MAX_REPARATIONS = 20
const PAYMENT_RATE = 0.5

export class DiplomaticWarReparationSystem {
  private reparations: WarReparation[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.createReparations(civManager, tick)
    this.processPayments(tick)
    this.checkDefaults(tick)
    this.cleanup()
  }

  private createReparations(civManager: CivManager, tick: number): void {
    if (!civManager?.civilizations) return
    if (this.reparations.length >= MAX_REPARATIONS) return

    const civs: Civilization[] = []
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 2) return

    for (const civ of civs) {
      if (Math.random() > REPARATION_CHANCE) continue
      if (this.reparations.length >= MAX_REPARATIONS) break

      // Find a potential victor (larger civ)
      const victor = civs.find((c: any) => c.id !== civ.id && (c.population || 0) > (civ.population || 0))
      if (!victor) continue
      if (this.hasActiveReparation(civ.id, victor.id)) continue

      this.reparations.push({
        id: this.nextId++,
        loserCivId: civ.id,
        victorCivId: victor.id,
        totalAmount: 100 + Math.floor(Math.random() * 500),
        paidAmount: 0,
        status: 'active',
        startTick: tick,
        deadline: tick + 5000 + Math.floor(Math.random() * 5000),
      })
    }
  }

  private processPayments(tick: number): void {
    for (const r of this.reparations) {
      if (r.status !== 'active') continue
      r.paidAmount = Math.min(r.totalAmount, r.paidAmount + PAYMENT_RATE)
      if (r.paidAmount >= r.totalAmount) {
        r.status = 'completed'
      }
    }
  }

  private checkDefaults(tick: number): void {
    for (const r of this.reparations) {
      if (r.status !== 'active') continue
      if (tick > r.deadline && r.paidAmount < r.totalAmount) {
        r.status = 'defaulted'
      }
    }
  }

  private cleanup(): void {
    // Keep only recent completed/defaulted, all active
    const active = this.reparations.filter(r => r.status === 'active')
    const finished = this.reparations.filter(r => r.status !== 'active')
    finished.sort((a, b) => b.startTick - a.startTick)
    this.reparations = [...active, ...finished.slice(0, MAX_REPARATIONS - active.length)]
  }

  private hasActiveReparation(loserId: number, victorId: number): boolean {
    return this.reparations.some(r => r.loserCivId === loserId && r.victorCivId === victorId && r.status === 'active')
  }

  getReparations(): WarReparation[] { return this.reparations }
  getActiveReparations(): WarReparation[] { return this.reparations.filter(r => r.status === 'active') }
  getCivDebt(civId: number): number {
    return this.reparations
      .filter(r => r.loserCivId === civId && r.status === 'active')
      .reduce((sum, r) => sum + (r.totalAmount - r.paidAmount), 0)
  }
}
