// Creature Fashion System (v2.43) - Creatures develop fashion trends
// Fashion trends spread through civs, affecting morale and social status
// Trends evolve over time and can be influenced by trade

import { EntityManager, EntityId } from '../ecs/Entity'

export type FashionCategory = 'headwear' | 'clothing' | 'jewelry' | 'warpaint' | 'hairstyle'

export interface FashionTrend {
  id: number
  civId: number
  category: FashionCategory
  name: string
  popularity: number    // 0-100
  startedAt: number
  followers: number
}

const CHECK_INTERVAL = 1000
const SPREAD_INTERVAL = 600
const MAX_TRENDS = 25
const TREND_DECAY = 1
const TREND_SPREAD = 3

const FASHION_CATEGORIES: FashionCategory[] = ['headwear', 'clothing', 'jewelry', 'warpaint', 'hairstyle']

const FASHION_NAMES: Record<FashionCategory, string[]> = {
  headwear: ['Feathered Crown', 'Iron Helm', 'Flower Wreath', 'Bone Circlet', 'Silk Hood'],
  clothing: ['Fur Cloak', 'Woven Tunic', 'Leather Vest', 'Dyed Robe', 'Scale Armor'],
  jewelry: ['Amber Necklace', 'Bone Ring', 'Crystal Pendant', 'Gold Bangle', 'Shell Earring'],
  warpaint: ['Tiger Stripes', 'Moon Marks', 'Blood Lines', 'Star Dots', 'Wave Pattern'],
  hairstyle: ['Braided Mane', 'Shaved Sides', 'Long Flow', 'Top Knot', 'Beaded Locks'],
}

let nextTrendId = 1

export class CreatureFashionSystem {
  private trends: FashionTrend[] = []
  private lastCheck = 0
  private lastSpread = 0

  update(dt: number, civIds: Iterable<number>, tick: number): void {
    if (tick - this.lastCheck >= CHECK_INTERVAL) {
      this.lastCheck = tick
      this.createTrends(civIds, tick)
    }
    if (tick - this.lastSpread >= SPREAD_INTERVAL) {
      this.lastSpread = tick
      this.spreadAndDecay()
    }
  }

  private createTrends(civIds: Iterable<number>, tick: number): void {
    if (this.trends.length >= MAX_TRENDS) return
    for (const civId of civIds) {
      if (Math.random() > 0.06) continue
      let civTrendCount = 0
      for (const t of this.trends) { if (t.civId === civId) civTrendCount++ }
      if (civTrendCount >= 4) continue
      const category = FASHION_CATEGORIES[Math.floor(Math.random() * FASHION_CATEGORIES.length)]
      const names = FASHION_NAMES[category]
      this.trends.push({
        id: nextTrendId++,
        civId,
        category,
        name: names[Math.floor(Math.random() * names.length)],
        popularity: 20 + Math.floor(Math.random() * 30),
        startedAt: tick,
        followers: 1 + Math.floor(Math.random() * 5),
      })
      if (this.trends.length >= MAX_TRENDS) break
    }
  }

  private spreadAndDecay(): void {
    for (const trend of this.trends) {
      // Spread
      if (trend.popularity > 30 && Math.random() < 0.3) {
        trend.followers = Math.min(100, trend.followers + Math.floor(Math.random() * 3) + 1)
        trend.popularity = Math.min(100, trend.popularity + TREND_SPREAD)
      }
      // Decay
      trend.popularity = Math.max(0, trend.popularity - TREND_DECAY)
    }
    for (let _i = this.trends.length - 1; _i >= 0; _i--) { if (this.trends[_i].popularity <= 5) this.trends.splice(_i, 1) }
  }

  getTrends(): FashionTrend[] {
    return this.trends
  }

  private _civTrendsBuf: FashionTrend[] = []
  getTrendsForCiv(civId: number): FashionTrend[] {
    this._civTrendsBuf.length = 0
    for (const t of this.trends) { if (t.civId === civId) this._civTrendsBuf.push(t) }
    return this._civTrendsBuf
  }
}
