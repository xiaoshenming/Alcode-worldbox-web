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
  private _civsBuf: Civilization[] = []
  private reparations: WarReparation[] = []
  private nextId = 1
  private lastCheck = 0
  private _activeBuf: WarReparation[] = []
  private _loserBuf: WarReparation[] = []

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

    const civs = this._civsBuf; civs.length = 0
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
    // Sort so most recent finished are at end
    this.reparations.sort((a, b) => {
      const aActive = a.status === 'active' ? 1 : 0
      const bActive = b.status === 'active' ? 1 : 0
      if (aActive !== bActive) return bActive - aActive // active first
      return b.startTick - a.startTick
    })
    // Count active to determine how many finished to keep
    let activeCount = 0
    for (const r of this.reparations) { if (r.status === 'active') activeCount++ }
    const maxFinished = MAX_REPARATIONS - activeCount
    let finishedSeen = 0
    for (let _i = this.reparations.length - 1; _i >= 0; _i--) {
      if (this.reparations[_i].status !== 'active') {
        finishedSeen++
        if (finishedSeen > maxFinished) this.reparations.splice(_i, 1)
      }
    }
  }

  private hasActiveReparation(loserId: number, victorId: number): boolean {
    return this.reparations.some(r => r.loserCivId === loserId && r.victorCivId === victorId && r.status === 'active')
  }
}
