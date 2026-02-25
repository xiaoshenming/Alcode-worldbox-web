// Creature Barter System (v3.11) - Barter trading between creatures
// Creatures exchange surplus resources with others for items they need

import { EntityManager, CreatureComponent } from '../ecs/Entity'

export type BarterItem = 'food' | 'wood' | 'stone' | 'gold' | 'herb' | 'gem'

export interface BarterDeal {
  id: number
  buyerId: number
  sellerId: number
  offeredItem: BarterItem
  requestedItem: BarterItem
  fairness: number   // 0-100
  tick: number
}

const CHECK_INTERVAL = 600
const BARTER_CHANCE = 0.02
const MAX_DEALS = 100

const ITEM_VALUES: Record<BarterItem, number> = {
  food: 1, wood: 2, stone: 3, gold: 8, herb: 4, gem: 10,
}
const ITEMS = Object.keys(ITEM_VALUES) as BarterItem[]

export class CreatureBarterSystem {
  private deals: BarterDeal[] = []
  private nextId = 1
  private lastCheck = 0

  update(dt: number, em: EntityManager, tick: number): void {
    if (tick - this.lastCheck < CHECK_INTERVAL) return
    this.lastCheck = tick

    this.attemptBarters(em, tick)
    this.resolveFairness()
    this.pruneOld()
  }

  private attemptBarters(em: EntityManager, tick: number): void {
    if (this.deals.length >= MAX_DEALS) return
    const entities = em.getEntitiesWithComponents('creature')
    const arr = Array.from(entities)
    if (arr.length < 2) return

    for (let i = 0; i < arr.length; i++) {
      if (Math.random() > BARTER_CHANCE) continue
      const partner = arr[Math.floor(Math.random() * arr.length)]
      if (partner === arr[i]) continue

      const offered = ITEMS[Math.floor(Math.random() * ITEMS.length)]
      let requested = ITEMS[Math.floor(Math.random() * ITEMS.length)]
      while (requested === offered) {
        requested = ITEMS[Math.floor(Math.random() * ITEMS.length)]
      }

      const valRatio = ITEM_VALUES[offered] / ITEM_VALUES[requested]
      const fairness = Math.min(100, Math.max(0, Math.round(valRatio * 50)))

      this.deals.push({
        id: this.nextId++,
        buyerId: arr[i],
        sellerId: partner,
        offeredItem: offered,
        requestedItem: requested,
        fairness,
        tick,
      })
    }
  }

  private resolveFairness(): void {
    for (const deal of this.deals) {
      // Fairness drifts slightly over time as perception changes
      deal.fairness = Math.min(100, Math.max(0,
        deal.fairness + (Math.random() - 0.5) * 4
      ))
    }
  }

  private pruneOld(): void {
    if (this.deals.length > MAX_DEALS) {
      this.deals.splice(0, this.deals.length - MAX_DEALS)
    }
  }

  getDeals(): BarterDeal[] { return this.deals }
  getRecentDeals(count: number): BarterDeal[] {
    return this.deals.slice(-count)
  }
}
