// Trade & Economy System (v1.12)
// Dynamic market prices, merchant guilds, specialty goods, inter-civ trade

import { CivManager } from '../civilization/CivManager'
import { EntityManager } from '../ecs/Entity'
import { World } from '../game/World'
import { ParticleSystem } from './ParticleSystem'
import { BuildingType, BuildingComponent, Civilization, CultureTrait } from '../civilization/Civilization'
import { EventLog } from './EventLog'

type ResourceKey = 'food' | 'wood' | 'stone' | 'gold'
const RESOURCE_KEYS: ResourceKey[] = ['food', 'wood', 'stone', 'gold']

const BASE_PRICES: Record<ResourceKey, number> = { food: 1.0, wood: 1.5, stone: 2.0, gold: 3.0 }
const MIN_PRICE_MULT = 0.5
const MAX_PRICE_MULT = 3.0
const TRADE_INTERVAL = 120

/** Pre-computed guild level thresholds — avoids per-civ literal array in updateGuild */
const _GUILD_LEVEL_THRESHOLDS = [0, 50, 150, 400, 800] as const
/** Pre-computed local price thresholds — avoids per-civ object literal in updateLocalPrices */
const _LOCAL_PRICE_THRESHOLDS: Record<string, number> = { food: 30, wood: 25, stone: 15, gold: 10 }
/** Pre-computed surplus thresholds — avoids per-civ object literal in findSurplus */
const _SURPLUS_THRESHOLDS: Record<string, number> = { food: 40, wood: 35, stone: 20, gold: 15 }

const SPECIALTY_MAP: Record<CultureTrait, string> = {
  warrior: 'weapons',
  merchant: 'luxury',
  scholar: 'books',
  nature: 'herbs',
  builder: 'tools',
}

interface MerchantGuild {
  level: number        // 1-5
  totalVolume: number  // cumulative trade volume
}

interface MarketPrices {
  food: number
  wood: number
  stone: number
  gold: number
}

export class TradeEconomySystem {
  private globalPrices: MarketPrices = { food: 1.0, wood: 1.0, stone: 1.0, gold: 1.0 }
  private localPrices: Map<number, MarketPrices> = new Map()
  private guilds: Map<number, MerchantGuild> = new Map()
  private _civsBuf: Civilization[] = []
  private _centerA = { x: 0, y: 0 }
  private _centerB = { x: 0, y: 0 }

  update(civManager: CivManager, em: EntityManager, world: World, particles: ParticleSystem, tick: number): void {
    if (tick % TRADE_INTERVAL !== 0) return

    this.updateGlobalPrices(civManager)

    const civs = this._civsBuf; civs.length = 0
    for (const civ of civManager.civilizations.values()) civs.push(civ)

    // Evaluate trade between all civ pairs
    for (let i = 0; i < civs.length; i++) {
      for (let j = i + 1; j < civs.length; j++) {
        this.evaluateTrade(civs[i], civs[j], civManager, em, particles, tick)
      }
    }
  }

  private updateGlobalPrices(civManager: CivManager): void {
    let totalFood = 0, totalWood = 0, totalStone = 0, totalGold = 0
    let civCount = 0
    for (const [, civ] of civManager.civilizations) {
      totalFood += civ.resources.food
      totalWood += civ.resources.wood
      totalStone += civ.resources.stone
      totalGold += civ.resources.gold
      civCount++
    }
    if (civCount === 0) return

    const avg = (total: number) => total / civCount
    // High supply -> lower price, low supply -> higher price
    this.globalPrices.food = this.clampPrice(20 / Math.max(1, avg(totalFood)))
    this.globalPrices.wood = this.clampPrice(25 / Math.max(1, avg(totalWood)))
    this.globalPrices.stone = this.clampPrice(15 / Math.max(1, avg(totalStone)))
    this.globalPrices.gold = this.clampPrice(10 / Math.max(1, avg(totalGold)))
  }

  private updateLocalPrices(civ: Civilization): void {
    const local: MarketPrices = { food: 1, wood: 1, stone: 1, gold: 1 }
    const keys = RESOURCE_KEYS
    const thresholds = _LOCAL_PRICE_THRESHOLDS

    for (const k of keys) {
      const supply = civ.resources[k]
      const demand = thresholds[k]
      const localMult = this.clampPrice(demand / Math.max(1, supply))
      // Blend 60% local, 40% global
      local[k] = this.clampPrice(localMult * 0.6 + this.globalPrices[k] * 0.4)
    }
    this.localPrices.set(civ.id, local)
  }

  private updateGuild(civ: Civilization, em: EntityManager, tick: number): void {
    if (civ.techLevel < 3) return
    const hasMarket = civ.buildings.some(id => {
      const b = em.getComponent<BuildingComponent>(id, 'building')
      return b && b.buildingType === BuildingType.MARKET
    })
    if (!hasMarket) return

    if (!this.guilds.has(civ.id)) {
      this.guilds.set(civ.id, { level: 1, totalVolume: 0 })
      EventLog.log('trade', `${civ.name} founded a Merchant Guild`, tick)
    }

    const guild = this.guilds.get(civ.id)
    if (!guild) return
    // Level up thresholds: 50, 150, 400, 800
    const thresholds = _GUILD_LEVEL_THRESHOLDS
    for (let lvl = 4; lvl >= 1; lvl--) {
      if (guild.totalVolume >= thresholds[lvl] && guild.level < lvl + 1) {
        guild.level = lvl + 1
        EventLog.log('trade', `${civ.name}'s Merchant Guild reached level ${guild.level}`, tick)
        break
      }
    }
  }

  private evaluateTrade(a: Civilization, b: Civilization, civManager: CivManager, em: EntityManager, particles: ParticleSystem, tick: number): void {
    const relA = a.relations.get(b.id) ?? 0
    const relB = b.relations.get(a.id) ?? 0
    // Need at least neutral relations to trade
    if (relA < -20 || relB < -20) return

    // Distance check via territory center approximation
    if (!this.civCenter(a, this._centerA) || !this.civCenter(b, this._centerB)) return
    const centerA = this._centerA, centerB = this._centerB
    const dist = Math.sqrt((centerA.x - centerB.x) ** 2 + (centerA.y - centerB.y) ** 2)
    if (dist > 120) return // too far

    // Find best resource exchange: A sells surplus, B sells surplus
    const tradeA = this.findSurplus(a)
    const tradeB = this.findSurplus(b)
    if (!tradeA && !tradeB) return

    let traded = false
    const guildA = this.guilds.get(a.id)
    const guildB = this.guilds.get(b.id)
    const discountA = guildA ? 1 - guildA.level * 0.04 : 1
    const discountB = guildB ? 1 - guildB.level * 0.04 : 1

    // Basic resource exchange
    if (tradeA && tradeB && tradeA !== tradeB) {
      traded = this.executeResourceTrade(a, b, tradeA, tradeB, discountA, discountB)
    }

    // Specialty goods trade
    const specTraded = this.tradeSpecialty(a, b, discountA, discountB)

    if (traded || specTraded) {
      // Gold income from trade
      const merchantBonusA = a.culture.trait === 'merchant' ? 1.3 : 1.0
      const merchantBonusB = b.culture.trait === 'merchant' ? 1.3 : 1.0
      a.resources.gold += 0.5 * merchantBonusA
      b.resources.gold += 0.5 * merchantBonusB

      // Improve relations
      a.relations.set(b.id, Math.min(100, relA + 1))
      b.relations.set(a.id, Math.min(100, relB + 1))

      // Track guild volume
      if (guildA) guildA.totalVolume += 1
      if (guildB) guildB.totalVolume += 1

      // Visual: gold particles at both civ centers
      particles.spawn(centerA.x, centerA.y, 3, '#ffd700', 1)
      particles.spawn(centerB.x, centerB.y, 3, '#ffd700', 1)

      EventLog.log('trade', `${a.name} traded with ${b.name}`, tick)
    }
  }

  private executeResourceTrade(a: Civilization, b: Civilization, resA: ResourceKey, resB: ResourceKey, discA: number, discB: number): boolean {
    const pricesA = this.localPrices.get(a.id)
    const pricesB = this.localPrices.get(b.id)
    if (!pricesA || !pricesB) return false

    // A sells resA (cheap locally, expensive for B), B sells resB
    const amountA = Math.min(5, a.resources[resA] * 0.1)
    const amountB = Math.min(5, b.resources[resB] * 0.1)
    if (amountA < 0.5 || amountB < 0.5) return false

    const valueA = amountA * BASE_PRICES[resA] * pricesB[resA] * discA
    const valueB = amountB * BASE_PRICES[resB] * pricesA[resB] * discB

    // Only trade if roughly balanced (within 2x)
    if (valueA > 0 && valueB > 0 && valueA / valueB < 2 && valueB / valueA < 2) {
      a.resources[resA] -= amountA
      b.resources[resA] += amountA
      b.resources[resB] -= amountB
      a.resources[resB] += amountB
      return true
    }
    return false
  }

  private tradeSpecialty(a: Civilization, b: Civilization, discA: number, discB: number): boolean {
    const specA = SPECIALTY_MAP[a.culture.trait]
    const specB = SPECIALTY_MAP[b.culture.trait]
    if (specA === specB) return false // same specialty, no advantage

    // Specialty trade: convert culture strength into gold bonus
    const bonusA = (a.culture.strength / 100) * 1.5 * discA
    const bonusB = (b.culture.strength / 100) * 1.5 * discB

    if (bonusA > 0.1 && bonusB > 0.1) {
      a.resources.gold += bonusA
      b.resources.gold += bonusB
      return true
    }
    return false
  }

  private findSurplus(civ: Civilization): ResourceKey | null {
    const keys = RESOURCE_KEYS
    const thresholds = _SURPLUS_THRESHOLDS
    let best: ResourceKey | null = null
    let bestRatio = 0
    for (const k of keys) {
      const ratio = civ.resources[k] / thresholds[k]
      if (ratio > 1.2 && ratio > bestRatio) {
        bestRatio = ratio
        best = k
      }
    }
    return best
  }

  private civCenter(civ: Civilization, out: { x: number; y: number }): boolean {
    if (civ.territory.size === 0) return false
    let sx = 0, sy = 0, n = 0
    // Sample up to 20 tiles for performance
    for (const key of civ.territory) {
      const comma = key.indexOf(',')
      sx += +key.substring(0, comma); sy += +key.substring(comma + 1); n++
      if (n >= 20) break
    }
    out.x = sx / n; out.y = sy / n
    return true
  }

  private clampPrice(v: number): number {
    return Math.max(MIN_PRICE_MULT, Math.min(MAX_PRICE_MULT, v))
  }

  // Public accessors for UI/debug
  getGlobalPrices(): MarketPrices { return { ...this.globalPrices } }
  getLocalPrices(civId: number): MarketPrices | null { return this.localPrices.get(civId) ?? null }
  getGuild(civId: number): MerchantGuild | null { return this.guilds.get(civId) ?? null }
}
