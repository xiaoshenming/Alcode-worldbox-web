// Diplomatic Hostage Exchange System (v3.135) - Trust-building through hostage exchange
// Civilizations exchange hostages to build mutual trust over time

import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'
import { Civilization } from '../civilization/Civilization'

export type ExchangeStatus = 'proposed' | 'active' | 'completed' | 'broken'

export interface HostageExchange {
  id: number
  civA: number
  civB: number
  hostageFromA: number
  hostageFromB: number
  trustGain: number
  duration: number
  status: ExchangeStatus
  tick: number
}

const CHECK_INTERVAL = 3600
const SPAWN_CHANCE = 0.002
const MAX_EXCHANGES = 6

export class DiplomaticHostageExchangeSystem {
  private _civsBuf: Civilization[] = []
  private exchanges: HostageExchange[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, world: any, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    if (!civManager?.civilizations) return
    const civs = this._civsBuf; civs.length = 0
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 2) return

    if (this.exchanges.length < MAX_EXCHANGES && Math.random() < SPAWN_CHANCE) {
      const iA = Math.floor(Math.random() * civs.length)
      let iB = Math.floor(Math.random() * civs.length)
      if (iB === iA) iB = (iB + 1) % civs.length

      this.exchanges.push({
        id: this.nextId++,
        civA: civs[iA].id,
        civB: civs[iB].id,
        hostageFromA: Math.floor(Math.random() * 10000),
        hostageFromB: Math.floor(Math.random() * 10000),
        trustGain: 5 + Math.floor(Math.random() * 20),
        duration: 5000 + Math.floor(Math.random() * 15000),
        status: 'proposed',
        tick,
      })
    }

    for (const ex of this.exchanges) {
      const age = tick - ex.tick

      if (ex.status === 'proposed' && Math.random() < 0.1) {
        ex.status = 'active'
      } else if (ex.status === 'active') {
        // Exchange may break down
        if (Math.random() < 0.005) {
          ex.status = 'broken'
        }
        // Complete after duration
        if (age > ex.duration) {
          ex.status = 'completed'
        }
      }
    }

    // Clean up resolved exchanges
    for (let i = this.exchanges.length - 1; i >= 0; i--) {
      const ex = this.exchanges[i]
      const resolved = ex.status === 'completed' || ex.status === 'broken'
      if (resolved && tick - ex.tick > ex.duration + 3000) {
        this.exchanges.splice(i, 1)
      }
    }
  }

  private _exchangesBuf: HostageExchange[] = []
}
