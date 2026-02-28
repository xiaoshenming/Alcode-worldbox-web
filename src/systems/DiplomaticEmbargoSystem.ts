// Diplomatic Embargo System (v3.58) - Civilizations impose trade embargoes
// Embargoes weaken target economies but can also hurt the imposer

import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { Civilization } from '../civilization/Civilization'

export type EmbargoSeverity = 'partial' | 'full' | 'blockade'
export type EmbargoStatus = 'active' | 'weakening' | 'lifted'

export interface Embargo {
  id: number
  imposerCivId: number
  targetCivId: number
  severity: EmbargoSeverity
  status: EmbargoStatus
  economicDamage: number
  selfDamage: number
  duration: number
  startTick: number
  supporterCivIds: number[]
}

const CHECK_INTERVAL = 1400
const EMBARGO_CHANCE = 0.003
const MAX_EMBARGOES = 12
const DAMAGE_RATE = 0.05
const SELF_DAMAGE_RATIO = 0.3
const WEAKEN_THRESHOLD = 60

const SEVERITIES: EmbargoSeverity[] = ['partial', 'full', 'blockade']

const DAMAGE_MAP: Record<EmbargoSeverity, number> = {
  partial: 0.4,
  full: 0.8,
  blockade: 1.2,
}

export class DiplomaticEmbargoSystem {
  private _civsBuf: Civilization[] = []
  private embargoes: Embargo[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (!civManager?.civilizations) return
    const civs = this._civsBuf; civs.length = 0
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 2) return

    // Start new embargoes
    if (this.embargoes.length < MAX_EMBARGOES && Math.random() < EMBARGO_CHANCE) {
      const iA = Math.floor(Math.random() * civs.length)
      let iB = Math.floor(Math.random() * civs.length)
      if (iB === iA) iB = (iB + 1) % civs.length

      const severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)]

      const supporters: number[] = []
      for (let i = 0; i < civs.length; i++) {
        if (i !== iA && i !== iB && Math.random() < 0.3) {
          supporters.push(civs[i].id)
        }
      }

      this.embargoes.push({
        id: this.nextId++,
        imposerCivId: civs[iA].id,
        targetCivId: civs[iB].id,
        severity,
        status: 'active',
        economicDamage: 0,
        selfDamage: 0,
        duration: 3000 + Math.random() * 5000,
        startTick: tick,
        supporterCivIds: supporters,
      })
    }

    // Update embargoes
    for (let i = this.embargoes.length - 1; i >= 0; i--) {
      const e = this.embargoes[i]
      const elapsed = tick - e.startTick
      const dmgMult = DAMAGE_MAP[e.severity]

      e.economicDamage += DAMAGE_RATE * dmgMult
      e.selfDamage += DAMAGE_RATE * dmgMult * SELF_DAMAGE_RATIO

      if (elapsed > e.duration * 0.7) {
        e.status = 'weakening'
      }

      if (elapsed > e.duration || e.selfDamage > WEAKEN_THRESHOLD) {
        e.status = 'lifted'
        this.embargoes.splice(i, 1)
      }
    }
  }

  private _embargoesBuf: Embargo[] = []
  getEmbargoes(): readonly Embargo[] { return this.embargoes }
  getEmbargoesAgainst(civId: number): Embargo[] {
    this._embargoesBuf.length = 0
    for (const e of this.embargoes) { if (e.targetCivId === civId && e.status === 'active') this._embargoesBuf.push(e) }
    return this._embargoesBuf
  }
}
