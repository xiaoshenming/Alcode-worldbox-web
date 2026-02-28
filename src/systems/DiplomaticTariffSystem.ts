// Diplomatic Tariff System (v3.48) - Civilizations impose trade tariffs
// Tariffs reduce trade efficiency and can spark trade wars

import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { Civilization } from '../civilization/Civilization'

export type TariffLevel = 'low' | 'moderate' | 'high' | 'prohibitive'

export interface Tariff {
  id: number
  imposerCivId: number
  targetCivId: number
  level: TariffLevel
  rate: number          // 0-1 tax rate
  retaliation: boolean  // has target retaliated
  revenue: number       // accumulated revenue
  startTick: number
  duration: number
}

const CHECK_INTERVAL = 1400
const TARIFF_CHANCE = 0.005
const MAX_TARIFFS = 25
const REVENUE_RATE = 0.5
const RETALIATION_CHANCE = 0.04

const RATE_MAP: Record<TariffLevel, number> = {
  low: 0.1,
  moderate: 0.25,
  high: 0.5,
  prohibitive: 0.85,
}

const LEVELS: TariffLevel[] = ['low', 'moderate', 'high', 'prohibitive']

export class DiplomaticTariffSystem {
  private _civsBuf: Civilization[] = []
  private tariffs: Tariff[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (!civManager?.civilizations) return
    const civs = this._civsBuf; civs.length = 0
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 2) return

    // Impose new tariffs
    if (this.tariffs.length < MAX_TARIFFS && Math.random() < TARIFF_CHANCE) {
      const imposer = civs[Math.floor(Math.random() * civs.length)]
      const target = civs[Math.floor(Math.random() * civs.length)]
      if (imposer.id !== target.id) {
        const level = LEVELS[Math.floor(Math.random() * LEVELS.length)]
        this.tariffs.push({
          id: this.nextId++,
          imposerCivId: imposer.id,
          targetCivId: target.id,
          level,
          rate: RATE_MAP[level],
          retaliation: false,
          revenue: 0,
          startTick: tick,
          duration: 3000 + Math.random() * 5000,
        })
      }
    }

    // Update tariffs
    for (const t of this.tariffs) {
      t.revenue += REVENUE_RATE * t.rate * CHECK_INTERVAL / 100

      // Retaliation check
      if (!t.retaliation && Math.random() < RETALIATION_CHANCE) {
        t.retaliation = true
        t.rate = Math.min(1, t.rate * 1.3)
      }

      // Expire
      const elapsed = tick - t.startTick
      if (elapsed > t.duration) {
        t.rate = 0
      }
    }

    for (let _i = this.tariffs.length - 1; _i >= 0; _i--) { if (!((t) => t.rate > 0.01)(this.tariffs[_i])) this.tariffs.splice(_i, 1) }
  }

  private _tariffsBuf: Tariff[] = []
  getTariffs(): Tariff[] {
    return this.tariffs
  }

  getByTarget(civId: number): Tariff[] {
    this._tariffsBuf.length = 0
    for (const t of this.tariffs) { if (t.targetCivId === civId) this._tariffsBuf.push(t) }
    return this._tariffsBuf
  }
}
