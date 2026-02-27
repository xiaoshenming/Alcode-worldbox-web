// Diplomatic Cultural Exchange System (v3.38) - Civs share culture and knowledge
// Cultural exchanges improve relations and spread technology between civilizations

import { Civilization } from '../civilization/Civilization'
import { EntityManager } from '../ecs/Entity'
import { CivManager } from '../civilization/CivManager'

export type ExchangeType = 'art' | 'music' | 'cuisine' | 'language' | 'technology' | 'religion'

export interface CulturalExchange {
  id: number
  senderCivId: number
  receiverCivId: number
  exchangeType: ExchangeType
  influence: number   // 0-100
  relationBoost: number
  startTick: number
  duration: number
}

const CHECK_INTERVAL = 1800
const EXCHANGE_CHANCE = 0.03
const MAX_EXCHANGES = 25

const TYPES: ExchangeType[] = ['art', 'music', 'cuisine', 'language', 'technology', 'religion']

const RELATION_BOOST: Record<ExchangeType, number> = {
  art: 5,
  music: 8,
  cuisine: 6,
  language: 10,
  technology: 12,
  religion: 4,
}

export class DiplomaticCulturalExchangeSystem {
  private exchanges: CulturalExchange[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, civManager: CivManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.initiateExchanges(civManager, tick)
    this.evolveInfluence()
    this.expireExchanges(tick)
    this.cleanup()
  }

  private initiateExchanges(civManager: CivManager, tick: number): void {
    if (!civManager?.civilizations) return
    if (this.exchanges.length >= MAX_EXCHANGES) return

    const civs: Civilization[] = []
    for (const civ of civManager.civilizations.values()) civs.push(civ)
    if (civs.length < 2) return

    for (const civ of civs) {
      if (Math.random() > EXCHANGE_CHANCE) continue
      if (this.exchanges.length >= MAX_EXCHANGES) break

      // Pick a random partner
      const partner = civs[Math.floor(Math.random() * civs.length)]
      if (partner.id === civ.id) continue
      if (this.hasActiveExchange(civ.id, partner.id)) continue

      const exchangeType = TYPES[Math.floor(Math.random() * TYPES.length)]

      this.exchanges.push({
        id: this.nextId++,
        senderCivId: civ.id,
        receiverCivId: partner.id,
        exchangeType,
        influence: 10 + Math.random() * 30,
        relationBoost: RELATION_BOOST[exchangeType],
        startTick: tick,
        duration: 3000 + Math.floor(Math.random() * 3000),
      })
    }
  }

  private evolveInfluence(): void {
    for (const e of this.exchanges) {
      e.influence = Math.min(100, e.influence + Math.random() * 0.5)
    }
  }

  private expireExchanges(tick: number): void {
    for (let _i = this.exchanges.length - 1; _i >= 0; _i--) { if (!((e) => tick - e.startTick < e.duration)(this.exchanges[_i])) this.exchanges.splice(_i, 1) }
  }

  private cleanup(): void {
    if (this.exchanges.length > MAX_EXCHANGES) {
      this.exchanges.sort((a, b) => b.influence - a.influence)
      this.exchanges.length = MAX_EXCHANGES
    }
  }

  private hasActiveExchange(senderId: number, receiverId: number): boolean {
    return this.exchanges.some(e => e.senderCivId === senderId && e.receiverCivId === receiverId)
  }

  private _civExchangesBuf: CulturalExchange[] = []
  getExchanges(): CulturalExchange[] { return this.exchanges }
  getCivExchanges(civId: number): CulturalExchange[] {
    this._civExchangesBuf.length = 0
    for (const e of this.exchanges) { if (e.senderCivId === civId || e.receiverCivId === civId) this._civExchangesBuf.push(e) }
    return this._civExchangesBuf
  }
}
