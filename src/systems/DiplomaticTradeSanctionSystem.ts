// Diplomatic Trade Sanction System (v3.68) - Targeted sanctions on specific goods
// Sanctions restrict specific trade categories, forcing economic adaptation

import { Civilization } from '../civilization/Civilization'
import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'

export type SanctionTarget = 'weapons' | 'food' | 'luxury' | 'raw_materials' | 'technology' | 'labor'
export type SanctionStatus = 'proposed' | 'active' | 'easing' | 'lifted'

export interface TradeSanction {
  id: number
  imposerCivId: number
  targetCivId: number
  sanctionTarget: SanctionTarget
  status: SanctionStatus
  severity: number       // 0-100
  economicImpact: number
  complianceRate: number // how well it's enforced
  duration: number
  startTick: number
}

const CHECK_INTERVAL = 1400
const SANCTION_CHANCE = 0.003
const MAX_SANCTIONS = 12
const IMPACT_RATE = 0.04
const COMPLIANCE_DECAY = 0.01

const TARGETS: SanctionTarget[] = ['weapons', 'food', 'luxury', 'raw_materials', 'technology', 'labor']

export class DiplomaticTradeSanctionSystem {
  private _civsBuf: Civilization[] = []
  private sanctions: TradeSanction[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (!civManager?.civilizations) return
    const civs = this._civsBuf; civs.length = 0
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 2) return

    // Propose new sanctions
    if (this.sanctions.length < MAX_SANCTIONS && Math.random() < SANCTION_CHANCE) {
      const iA = Math.floor(Math.random() * civs.length)
      let iB = Math.floor(Math.random() * civs.length)
      if (iB === iA) iB = (iB + 1) % civs.length

      const target = TARGETS[Math.floor(Math.random() * TARGETS.length)]

      this.sanctions.push({
        id: this.nextId++,
        imposerCivId: civs[iA].id,
        targetCivId: civs[iB].id,
        sanctionTarget: target,
        status: 'proposed',
        severity: 30 + Math.random() * 60,
        economicImpact: 0,
        complianceRate: 70 + Math.random() * 30,
        duration: 4000 + Math.random() * 6000,
        startTick: tick,
      })
    }

    // Update sanctions
    for (let i = this.sanctions.length - 1; i >= 0; i--) {
      const s = this.sanctions[i]
      const elapsed = tick - s.startTick

      if (s.status === 'proposed') {
        s.status = Math.random() < 0.7 ? 'active' : 'lifted'
      } else if (s.status === 'active') {
        s.economicImpact += IMPACT_RATE * (s.severity / 100) * (s.complianceRate / 100)
        s.complianceRate = Math.max(20, s.complianceRate - COMPLIANCE_DECAY)

        if (elapsed > s.duration * 0.8) {
          s.status = 'easing'
        }
      } else if (s.status === 'easing') {
        s.severity *= 0.95
      }

      if (elapsed > s.duration || s.status === 'lifted') {
        this.sanctions.splice(i, 1)
      }
    }
  }

  private _sanctionsBuf: TradeSanction[] = []
  getSanctions(): readonly TradeSanction[] { return this.sanctions }
  getSanctionsAgainst(civId: number): TradeSanction[] {
    this._sanctionsBuf.length = 0
    for (const s of this.sanctions) { if (s.targetCivId === civId && s.status === 'active') this._sanctionsBuf.push(s) }
    return this._sanctionsBuf
  }
}
